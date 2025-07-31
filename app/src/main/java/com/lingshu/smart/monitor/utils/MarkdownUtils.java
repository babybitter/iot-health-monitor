package com.lingshu.smart.monitor.utils;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.text.Spanned;
import android.widget.TextView;

import io.noties.markwon.Markwon;
import io.noties.markwon.core.CorePlugin;
import io.noties.markwon.html.HtmlPlugin;
import io.noties.markwon.image.ImagesPlugin;


/**
 * Markdown渲染工具类
 * 用于将Markdown文本转换为富文本并显示在TextView中
 */
public class MarkdownUtils {
    
    private static Markwon markwon;
    
    /**
     * 初始化Markwon实例
     */
    public static void init(Context context) {
        if (markwon == null) {
            markwon = Markwon.builder(context)
                    .usePlugin(CorePlugin.create())
                    .usePlugin(HtmlPlugin.create())
                    .usePlugin(ImagesPlugin.create())
                    .build();
        }
    }
    
    /**
     * 将Markdown文本渲染到TextView
     */
    public static void setMarkdownText(TextView textView, String markdownText) {
        if (markwon == null) {
            init(textView.getContext());
        }

        // 预处理Markdown文本，确保格式正确
        String processedText = preprocessMarkdown(markdownText);

        // 调试日志
        android.util.Log.d("MarkdownUtils", "Original text: " + markdownText);
        android.util.Log.d("MarkdownUtils", "Processed text: " + processedText);

        // 渲染Markdown
        markwon.setMarkdown(textView, processedText);
    }
    
    /**
     * 将Markdown文本转换为Spanned对象
     */
    public static Spanned parseMarkdown(Context context, String markdownText) {
        if (markwon == null) {
            init(context);
        }
        
        String processedText = preprocessMarkdown(markdownText);
        return markwon.toMarkdown(processedText);
    }
    
    /**
     * 预处理Markdown文本
     * 修复常见的格式问题
     */
    private static String preprocessMarkdown(String text) {
        if (text == null || text.isEmpty()) {
            return "";
        }

        // 简单的预处理，不做复杂的正则替换
        // 只确保基本的换行格式
        text = text.replace("\n\n\n", "\n\n");

        return text.trim();
    }
    
    /**
     * 检查文本是否包含Markdown语法
     */
    public static boolean containsMarkdown(String text) {
        if (text == null || text.isEmpty()) {
            return false;
        }

        // 检查常见的Markdown语法
        return text.contains("###") ||
               text.contains("**") ||
               text.contains("- **") ||
               text.contains("* **") ||
               text.contains("`") ||
               text.contains("[") ||
               text.contains("](");
    }
}
