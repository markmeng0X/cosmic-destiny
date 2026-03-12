import { db } from "../db";
import { knowledgeChunks, knowledgeFiles, type KnowledgeChunk, type KnowledgeFile } from "@shared/schema";
import { eq, sql, desc, ilike, or } from "drizzle-orm";

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 50;
const TOP_K = 5;

interface ChunkResult {
  content: string;
  similarity: number;
}

export async function splitTextIntoChunks(text: string): Promise<string[]> {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?。！？\n])\s*/);
  
  let currentChunk = "";
  let currentTokenEstimate = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.length / 4);
    
    if (currentTokenEstimate + sentenceTokens > CHUNK_SIZE && currentChunk) {
      chunks.push(currentChunk.trim());
      const overlapText = currentChunk.slice(-CHUNK_OVERLAP * 4);
      currentChunk = overlapText + " " + sentence;
      currentTokenEstimate = Math.ceil(currentChunk.length / 4);
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
      currentTokenEstimate += sentenceTokens;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function storeKnowledgeFile(
  fileId: string,
  filename: string,
  fileType: string,
  content: string,
  uploadedBy?: string
): Promise<KnowledgeFile> {
  await db.delete(knowledgeChunks).where(eq(knowledgeChunks.sourceFileId, fileId));
  await db.delete(knowledgeFiles).where(eq(knowledgeFiles.id, fileId));

  const [file] = await db.insert(knowledgeFiles).values({
    id: fileId,
    filename,
    fileType,
    fileSize: content.length,
    status: "processing",
    uploadedBy,
  }).returning();

  const chunks = await splitTextIntoChunks(content);
  
  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];
      
      await db.insert(knowledgeChunks).values({
        sourceFileId: fileId,
        chunkIndex: i,
        content: chunkContent,
        embedding: null,
        metadata: { tokenEstimate: Math.ceil(chunkContent.length / 4) },
      });
    }

    const [updatedFile] = await db.update(knowledgeFiles)
      .set({ 
        status: "ready", 
        chunkCount: chunks.length,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeFiles.id, fileId))
      .returning();

    return updatedFile;
  } catch (error) {
    console.error("Error processing knowledge file:", error);
    await db.delete(knowledgeChunks).where(eq(knowledgeChunks.sourceFileId, fileId));
    await db.update(knowledgeFiles)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(knowledgeFiles.id, fileId));
    throw error;
  }
}

export async function clearAllKnowledge(): Promise<void> {
  await db.delete(knowledgeChunks);
  await db.delete(knowledgeFiles);
}

// Keyword-based search (no embeddings required)
export async function searchKnowledge(query: string, topK: number = TOP_K): Promise<ChunkResult[]> {
  const fileCount = await db.select({ count: sql<number>`count(*)` })
    .from(knowledgeFiles)
    .where(eq(knowledgeFiles.status, "ready"));
  
  if (!fileCount[0]?.count || fileCount[0].count === 0) {
    return [];
  }

  // Extract keywords from query for keyword-based search
  const keywords = query
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(k => k.length >= 2);
  
  if (keywords.length === 0) {
    // If no valid keywords, return first few chunks
    const results = await db.select({
      content: knowledgeChunks.content,
    })
    .from(knowledgeChunks)
    .innerJoin(knowledgeFiles, eq(knowledgeChunks.sourceFileId, knowledgeFiles.id))
    .where(eq(knowledgeFiles.status, "ready"))
    .orderBy(knowledgeChunks.chunkIndex)
    .limit(topK);
    
    return results.map(r => ({ content: r.content, similarity: 0.5 }));
  }

  // Build keyword search conditions
  const searchConditions = keywords.map(keyword => 
    ilike(knowledgeChunks.content, `%${keyword}%`)
  );

  // Search using PostgreSQL full-text or ILIKE
  const results = await db.execute(sql`
    SELECT kc.content,
           (
             ${sql.join(
               keywords.map(k => sql`CASE WHEN kc.content ILIKE ${'%' + k + '%'} THEN 1 ELSE 0 END`),
               sql` + `
             )}
           ) as match_score
    FROM knowledge_chunks kc
    INNER JOIN knowledge_files kf ON kc.source_file_id = kf.id
    WHERE kf.status = 'ready'
      AND (${sql.join(searchConditions.map(c => sql`kc.content ILIKE ${'%' + keywords[0] + '%'}`), sql` OR `)})
    ORDER BY match_score DESC, kc.chunk_index ASC
    LIMIT ${topK}
  `);

  if ((results.rows as any[]).length === 0) {
    // Fallback: return first few chunks if no keyword match
    const fallback = await db.select({
      content: knowledgeChunks.content,
    })
    .from(knowledgeChunks)
    .innerJoin(knowledgeFiles, eq(knowledgeChunks.sourceFileId, knowledgeFiles.id))
    .where(eq(knowledgeFiles.status, "ready"))
    .orderBy(knowledgeChunks.chunkIndex)
    .limit(topK);
    
    return fallback.map(r => ({ content: r.content, similarity: 0.3 }));
  }

  return (results.rows as any[]).map(row => ({
    content: row.content,
    similarity: row.match_score / keywords.length,
  }));
}

export async function getKnowledgeStatus(): Promise<{
  hasKnowledge: boolean;
  files: KnowledgeFile[];
  totalChunks: number;
  lastUpdated: Date | null;
}> {
  const files = await db.select().from(knowledgeFiles).orderBy(desc(knowledgeFiles.updatedAt));
  const chunkCount = await db.select({ count: sql<number>`count(*)` }).from(knowledgeChunks);
  
  return {
    hasKnowledge: files.length > 0 && files.some(f => f.status === "ready"),
    files,
    totalChunks: Number(chunkCount[0]?.count || 0),
    lastUpdated: files[0]?.updatedAt || null,
  };
}

export async function buildRAGContext(userQuery: string, baziData?: Record<string, any>): Promise<string> {
  const searchQuery = baziData 
    ? `${userQuery} 日主:${baziData.dayStem || ""} 用神:${baziData.favorableGods?.join(",") || ""}`
    : userQuery;
  
  const chunks = await searchKnowledge(searchQuery);
  
  if (chunks.length === 0) {
    return "";
  }

  return chunks.map(c => c.content).join("\n\n---\n\n");
}

export function buildRAGPrompt(
  systemPrompt: string,
  ragContext: string,
  userRequest: string
): string {
  if (!ragContext) {
    return `${systemPrompt}\n\n【用户请求】:\n${userRequest}`;
  }

  return `${systemPrompt}

【命理协议】:
${ragContext}

【用户请求】:
${userRequest}

请根据【命理协议】和【用户请求】进行解读。`;
}

export function getRAGSystemPrompt(language: string = "zh"): string {
  const prompts: Record<string, string> = {
    zh: `你是一位专业的命理大师，你的解读必须严格遵循提供的【命理协议】。
请使用中文进行解读，风格应专业、严谨、富有洞察力。
如果提供了命理协议，请优先参考其中的术语和解读方法。`,
    en: `You are a professional astrology master. Your interpretations must strictly follow the provided [Astrology Protocol].
Please respond in English with a professional, rigorous, and insightful style.
If an astrology protocol is provided, prioritize its terminology and interpretation methods.`,
    ja: `あなたは専門的な命理師です。あなたの解読は提供された【命理協議】に厳密に従う必要があります。
日本語で専門的、厳密、洞察力のあるスタイルで回答してください。
命理協議が提供された場合は、その用語と解読方法を優先してください。`,
    ko: `당신은 전문 명리사입니다. 당신의 해석은 제공된 【명리 프로토콜】을 엄격히 따라야 합니다.
전문적이고 엄격하며 통찰력 있는 스타일로 한국어로 응답해 주세요.
명리 프로토콜이 제공된 경우 해당 용어와 해석 방법을 우선시하세요.`,
  };
  return prompts[language] || prompts.zh;
}

export const RAG_SYSTEM_PROMPT = getRAGSystemPrompt("zh");
