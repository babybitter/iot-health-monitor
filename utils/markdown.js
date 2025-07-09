// Markdown渲染工具类
class MarkdownRenderer {
  
  // 渲染Markdown文本为小程序可显示的格式
  static render(markdown) {
    if (!markdown || typeof markdown !== 'string') {
      return markdown;
    }

    let html = markdown;

    // 1. 处理粗体 **text** 或 __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '$1');
    html = html.replace(/__(.*?)__/g, '$1');

    // 2. 处理斜体 *text* 或 _text_
    html = html.replace(/\*(.*?)\*/g, '$1');
    html = html.replace(/_(.*?)_/g, '$1');

    // 3. 处理标题 # ## ### 等
    html = html.replace(/^### (.*$)/gm, '▸ $1');
    html = html.replace(/^## (.*$)/gm, '◆ $1');
    html = html.replace(/^# (.*$)/gm, '● $1');

    // 4. 处理列表项
    html = html.replace(/^\* (.*$)/gm, '• $1');
    html = html.replace(/^- (.*$)/gm, '• $1');
    html = html.replace(/^\+ (.*$)/gm, '• $1');

    // 5. 处理有序列表
    html = html.replace(/^\d+\. (.*$)/gm, (match, p1, offset, string) => {
      const lines = string.substring(0, offset).split('\n');
      const currentLineIndex = lines.length - 1;
      let number = 1;
      
      // 计算当前项的序号
      for (let i = currentLineIndex - 1; i >= 0; i--) {
        if (lines[i].match(/^\d+\. /)) {
          number++;
        } else if (lines[i].trim() === '') {
          continue;
        } else {
          break;
        }
      }
      
      return `${number}. ${p1}`;
    });

    // 6. 处理代码块 ```code```
    html = html.replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```/g, '').trim();
      return `「代码」\n${code}\n`;
    });

    // 7. 处理行内代码 `code`
    html = html.replace(/`([^`]+)`/g, '「$1」');

    // 8. 处理链接 [text](url)
    html = html.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 9. 处理分割线
    html = html.replace(/^---+$/gm, '────────────────');
    html = html.replace(/^\*\*\*+$/gm, '────────────────');

    // 10. 处理引用 > text
    html = html.replace(/^> (.*$)/gm, '💡 $1');

    // 11. 清理多余的空行
    html = html.replace(/\n{3,}/g, '\n\n');

    // 12. 处理表格（简化处理）
    html = html.replace(/\|.*\|/g, (match) => {
      return match.replace(/\|/g, ' | ').replace(/\s+/g, ' ').trim();
    });

    return html.trim();
  }

  // 检测是否包含Markdown语法
  static hasMarkdown(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const markdownPatterns = [
      /\*\*.*?\*\*/,  // 粗体
      /__.*?__/,      // 粗体
      /\*.*?\*/,      // 斜体
      /_.*?_/,        // 斜体
      /^#{1,6}\s/m,   // 标题
      /^\*\s/m,       // 列表
      /^-\s/m,        // 列表
      /^\d+\.\s/m,    // 有序列表
      /```[\s\S]*?```/, // 代码块
      /`[^`]+`/,      // 行内代码
      /\[.*?\]\(.*?\)/, // 链接
      /^>\s/m         // 引用
    ];

    return markdownPatterns.some(pattern => pattern.test(text));
  }

  // 为小程序优化的渲染（保留更多格式信息）
  static renderForWeapp(markdown) {
    if (!markdown || typeof markdown !== 'string') {
      return { text: markdown, hasFormatting: false };
    }

    const hasFormatting = this.hasMarkdown(markdown);
    const rendered = this.render(markdown);

    return {
      text: rendered,
      hasFormatting: hasFormatting,
      original: markdown
    };
  }

  // 渐进式渲染（用于流式输出）
  static renderProgressive(text, isComplete = false) {
    // 如果文本还在输入中，只做基本的格式化
    if (!isComplete) {
      return text.replace(/\*\*(.*?)\*\*/g, '$1')
                 .replace(/\*(.*?)\*/g, '$1')
                 .replace(/`([^`]+)`/g, '「$1」');
    }
    
    // 完整渲染
    return this.render(text);
  }
}

module.exports = MarkdownRenderer;
