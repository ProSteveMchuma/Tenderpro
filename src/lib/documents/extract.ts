import "server-only";
import { stripPromptInjection } from "@/lib/ai/schemas";

export interface OcrProvider {
  extractTextFromImage(buffer: Buffer, mime: string): Promise<{ text: string; confidence: number }>;
}

export class UnavailableOcrProvider implements OcrProvider {
  async extractTextFromImage(): Promise<{ text: string; confidence: number }> {
    return { text: "", confidence: 0 };
  }
}

export function getOcrProvider(): OcrProvider {
  return new UnavailableOcrProvider();
}

export async function extractTextFromBuffer(buffer: Buffer, mime: string, fileName: string): Promise<string> {
  if (mime === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    const { extractText } = await import("unpdf");
    const result = await extractText(new Uint8Array(buffer));
    const text = Array.isArray(result.text) ? result.text.join("\n") : String(result.text ?? "");
    if (text.trim()) return stripPromptInjection(text);
    const ocr = await getOcrProvider().extractTextFromImage(buffer, mime);
    return stripPromptInjection(ocr.text);
  }
  if (
    mime.includes("wordprocessingml") ||
    fileName.toLowerCase().endsWith(".docx") ||
    fileName.toLowerCase().endsWith(".doc")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return stripPromptInjection(result.value || "");
  }
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    fileName.toLowerCase().endsWith(".xlsx") ||
    fileName.toLowerCase().endsWith(".xls") ||
    fileName.toLowerCase().endsWith(".csv")
  ) {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    if (fileName.toLowerCase().endsWith(".csv") || mime === "text/csv") {
      return stripPromptInjection(buffer.toString("utf8"));
    }
    // @ts-expect-error buffer load
    await workbook.xlsx.load(buffer);
    const lines: string[] = [];
    workbook.eachSheet((sheet) => {
      sheet.eachRow((row) => {
        lines.push(row.values?.toString() ?? "");
      });
    });
    return stripPromptInjection(lines.join("\n"));
  }
  if (mime.startsWith("image/")) {
    const ocr = await getOcrProvider().extractTextFromImage(buffer, mime);
    return stripPromptInjection(ocr.text);
  }
  return stripPromptInjection(buffer.toString("utf8"));
}
