
import { CodeFile } from '../types';

export const parseCodeFromResponse = (response: string): { text: string; files: CodeFile[] } => {
  const fileRegex = /<file name="([^"]+)">([\s\S]*?)<\/file>/g;
  const aiImagePromptRegex = /<ai_image_prompt name="([^"]+)">([\s\S]*?)<\/ai_image_prompt>/g;
  
  // Регулярка для обнаружения "утекших" блоков кода markdown
  const markdownCodeBlockRegex = /```(?:csharp|cs|)\n([\s\S]*?)```/gi;

  const files: CodeFile[] = [];
  let currentResponseText = response;

  // 1. Извлекаем файлы в отдельную вкладку
  currentResponseText = currentResponseText.replace(fileRegex, (match, name, content) => {
    files.push({
      name: name,
      language: 'csharp',
      content: content.trim(),
      versions: [{ version: 1, content: content.trim(), timestamp: Date.now() }]
    });
    return `📄 **Обновлен файл:** [${name}](#code-view)`;
  });

  // 2. Форматируем AI промпты с гарантированным переносом строк
  currentResponseText = currentResponseText.replace(aiImagePromptRegex, (match, name, promptContent) => {
    return `\n\n🖼️ **AI-промпт для:** **${name}**\n\`\`\`text\n${promptContent.trim()}\n\`\`\`\n`;
  });

  // 3. ФИЛЬТРАЦИЯ: Удаляем из текста чата любые блоки кода C#, которые модель могла выдать по ошибке через ```.
  // Это гарантирует, что код будет виден ТОЛЬКО во вкладке "Код".
  currentResponseText = currentResponseText.replace(markdownCodeBlockRegex, (match, content) => {
    const lowerContent = content.toLowerCase();
    // Если внутри блока есть ключевые слова Unity/C#, удаляем его целиком из текстового ответа
    if (
      lowerContent.includes('using unityengine') || 
      lowerContent.includes('public class') || 
      lowerContent.includes('void update') ||
      lowerContent.includes('monobehaviour') ||
      lowerContent.includes('void start') ||
      lowerContent.includes('unityengine.ui')
    ) {
      return ''; 
    }
    return match; // Если это просто текст или другой промпт (например, для арта), оставляем
  });

  return { text: currentResponseText, files };
};
