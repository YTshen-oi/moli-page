# -*- coding: utf-8 -*-
"""
md2data.py - 把「君辞人生小书」的 markdown 卷转换成 site_moli/book-data.js
纯标准库实现，不依赖任何外部包。
用法：python md2data.py
"""
import os
import re
import json

SRC_DIR = r"E:\墨漓工作区\文档\君辞人生小书"
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "book-data.js")

# (文件名, id, date, desc)
# desc 取自 README「目录」里的简介；README 总纲的 desc 为自拟一句
VOLUMES = [
    ("README.md", "readme", "2026-08-13", "总纲：书名、引言、原则与目录"),
    ("卷一-无根之智.md", "vol1", "2026-08-13", "关于 AI、文字与「人」的完整思想链"),
    ("卷一-附录-逻辑漏洞清单.md", "vol1-appendix", "2026-08-13", "对卷一 AI 论证的七处漏洞审查；漏洞二、三、四第一层已补，其余待补"),
    ("卷二-哲学之思.md", "vol2", "2026-08-13", "哲学为什么「越发展越退步」、理想哲学的模样"),
    ("卷三-十六岁的锚与帆.md", "vol3", "2026-08-13", "知足与贪婪、对未来的期许"),
    ("卷四-论我的成长.md", "vol4", "2026-08-14", "促使与迫使、矛盾与抉择、糊里糊涂的年轮"),
]


def escape_html(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def inline(text):
    text = escape_html(text)
    # 行内代码
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    # 粗体
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    # 斜体
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    # 链接
    text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2" target="_blank" rel="noopener noreferrer">\1</a>', text)
    return text


def is_block_start(s):
    return (
        re.match(r"^#{1,6}\s+", s)
        or s.startswith("```")
        or s.startswith(">")
        or s.startswith("|")
        or re.match(r"^[-*+]\s+", s)
        or re.match(r"^\d+[.)]\s+", s)
        or re.match(r"^(-{3,}|\*{3,}|_{3,})$", s)
    )


def parse_table_row(line):
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [c.strip() for c in line.split("|")]


def build_table(header, rows):
    parts = ["<table><thead><tr>"]
    for h in header:
        parts.append("<th>%s</th>" % inline(h))
    parts.append("</tr></thead><tbody>")
    for r in rows:
        parts.append("<tr>")
        for c in r:
            parts.append("<td>%s</td>" % inline(c))
        parts.append("</tr>")
    parts.append("</tbody></table>")
    return "".join(parts)


def collect_list(lines, i, n, pattern):
    """收集同类列表项；跳过空行继续（松散列表），遇到非同类块则停止。"""
    items = []
    while i < n:
        s = lines[i].strip()
        m = pattern.match(s)
        if m:
            items.append(m.group(1))
            i += 1
            continue
        # 跳过空行，看后面是否仍是同类列表项
        j = i
        while j < n and not lines[j].strip():
            j += 1
        if j < n and pattern.match(lines[j].strip()):
            i = j
            continue
        break
    return items, i


def md_to_html(text):
    lines = text.split("\n")
    out = []
    i = 0
    n = len(lines)
    in_code = False
    code_lines = []

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # 代码块
        if stripped.startswith("```"):
            if in_code:
                out.append("<pre><code>%s</code></pre>" % escape_html("\n".join(code_lines)))
                in_code = False
                code_lines = []
            else:
                in_code = True
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # 空行
        if not stripped:
            i += 1
            continue

        # 标题
        m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            out.append("<h%d>%s</h%d>" % (level, inline(m.group(2)), level))
            i += 1
            continue

        # 分隔线
        if re.match(r"^(-{3,}|\*{3,}|_{3,})$", stripped):
            out.append("<hr>")
            i += 1
            continue

        # 引用
        if stripped.startswith(">"):
            quote_lines = []
            while i < n and lines[i].strip().startswith(">"):
                q = lines[i].strip()
                if q.startswith("> "):
                    q = q[2:]
                elif q == ">":
                    q = ""
                quote_lines.append(q)
                i += 1
            out.append("<blockquote>%s</blockquote>" % md_to_html("\n".join(quote_lines)))
            continue

        # 表格
        if stripped.startswith("|") and i + 1 < n and re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()):
            header = parse_table_row(stripped)
            i += 2
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append(parse_table_row(lines[i].strip()))
                i += 1
            out.append(build_table(header, rows))
            continue

        # 无序列表
        if re.match(r"^[-*+]\s+", stripped):
            pattern = re.compile(r"^[-*+]\s+(.*)$")
            items, i = collect_list(lines, i, n, pattern)
            out.append("<ul>%s</ul>" % "".join("<li>%s</li>" % inline(it) for it in items))
            continue

        # 有序列表
        if re.match(r"^\d+[.)]\s+", stripped):
            pattern = re.compile(r"^\d+[.)]\s+(.*)$")
            items, i = collect_list(lines, i, n, pattern)
            out.append("<ol>%s</ol>" % "".join("<li>%s</li>" % inline(it) for it in items))
            continue

        # 段落
        para = [line]
        i += 1
        while i < n and lines[i].strip() and not is_block_start(lines[i].strip()):
            para.append(lines[i])
            i += 1
        out.append("<p>%s</p>" % "<br>".join(inline(l) for l in para))

    return "\n".join(out)


def extract_title(text):
    for line in text.split("\n"):
        m = re.match(r"^#\s+(.*)$", line)
        if m:
            return m.group(1).strip()
    return ""


def main():
    items = []
    for fname, vid, date, desc in VOLUMES:
        path = os.path.join(SRC_DIR, fname)
        with open(path, "r", encoding="utf-8") as f:
            raw = f.read()
        title = extract_title(raw)
        html = md_to_html(raw)
        items.append({
            "id": vid,
            "title": title,
            "date": date,
            "desc": desc,
            "html": html,
        })

    header = (
        "// 本文件由 md2data.py 自动生成，请勿手工编辑。\n"
        "// 数据源：E:\\墨漓工作区\\文档\\君辞人生小书\\*.md\n"
        "// 重新运行 python md2data.py 可重新生成。\n"
    )
    body = "window.BOOK_DATA = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n"

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(header)
        f.write(body)

    print("生成 book-data.js：%d 卷" % len(items))
    for it in items:
        print("  - %s | %s" % (it["id"], it["title"]))


if __name__ == "__main__":
    main()
