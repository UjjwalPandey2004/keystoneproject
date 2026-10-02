package com.keystone.deliveryservice.Service.pdf;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Minimal single-page PDF writer (PDF 1.4) for documents made of text, filled shapes and lines.
 * It uses the built-in Helvetica fonts, so nothing has to be embedded and no library is needed.
 * Coordinates are in points from the bottom-left corner of an A4 page (595 x 842).
 */
public class SimplePdf {

    public static final float PAGE_WIDTH = 595f;
    public static final float PAGE_HEIGHT = 842f;

    public enum Font { REGULAR, BOLD }

    private final StringBuilder content = new StringBuilder();

    public SimplePdf fillRect(float x, float y, float width, float height, int rgb) {
        content.append(color(rgb, "rg")).append(String.format(Locale.ROOT, "%.2f %.2f %.2f %.2f re f\n", x, y, width, height));
        return this;
    }

    public SimplePdf strokeRect(float x, float y, float width, float height, int rgb, float lineWidth) {
        content.append(color(rgb, "RG")).append(String.format(Locale.ROOT, "%.2f w %.2f %.2f %.2f %.2f re S\n",
                lineWidth, x, y, width, height));
        return this;
    }

    public SimplePdf line(float x1, float y1, float x2, float y2, int rgb, float lineWidth) {
        content.append(color(rgb, "RG")).append(String.format(Locale.ROOT, "%.2f w %.2f %.2f m %.2f %.2f l S\n",
                lineWidth, x1, y1, x2, y2));
        return this;
    }

    /** Filled polygon from x,y pairs. */
    public SimplePdf fillPolygon(int rgb, float... points) {
        content.append(color(rgb, "rg"));
        for (int i = 0; i < points.length; i += 2) {
            content.append(String.format(Locale.ROOT, "%.2f %.2f %s ", points[i], points[i + 1], i == 0 ? "m" : "l"));
        }
        content.append("h f\n");
        return this;
    }

    public SimplePdf text(String value, float x, float y, Font font, float size, int rgb) {
        content.append("BT ").append(color(rgb, "rg"))
                .append(String.format(Locale.ROOT, "/%s %.1f Tf %.2f %.2f Td (", font == Font.BOLD ? "F2" : "F1", size, x, y))
                .append(escape(value)).append(") Tj ET\n");
        return this;
    }

    /** Right-aligned text ending at x, using approximate Helvetica widths. */
    public SimplePdf textRight(String value, float x, float y, Font font, float size, int rgb) {
        return text(value, x - width(value, font, size), y, font, size, rgb);
    }

    /** Approximate rendered width; good enough for right-aligning short labels and amounts. */
    public static float width(String value, Font font, float size) {
        float units = 0;
        for (char c : value.toCharArray()) {
            if ("il.,:;'|!".indexOf(c) >= 0) units += 0.28f;
            else if ("ftjrI() -".indexOf(c) >= 0) units += 0.36f;
            else if (Character.isDigit(c)) units += 0.556f;
            else if ("mwMW".indexOf(c) >= 0) units += 0.85f;
            else if (Character.isUpperCase(c)) units += 0.68f;
            else units += 0.54f;
        }
        return units * size * (font == Font.BOLD ? 1.04f : 1f);
    }

    public byte[] toBytes() {
        byte[] stream = content.toString().getBytes(StandardCharsets.ISO_8859_1);
        List<String> objects = new ArrayList<>();
        objects.add("<< /Type /Catalog /Pages 2 0 R >>");
        objects.add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        objects.add(String.format(Locale.ROOT,
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.0f %.0f] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
                PAGE_WIDTH, PAGE_HEIGHT));
        objects.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        objects.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        List<Integer> offsets = new ArrayList<>();
        write(out, "%PDF-1.4\n%âãÏÓ\n");
        for (int i = 0; i < objects.size(); i++) {
            offsets.add(out.size());
            write(out, (i + 1) + " 0 obj\n" + objects.get(i) + "\nendobj\n");
        }
        offsets.add(out.size());
        write(out, "6 0 obj\n<< /Length " + stream.length + " >>\nstream\n");
        out.writeBytes(stream);
        write(out, "\nendstream\nendobj\n");

        int xref = out.size();
        StringBuilder table = new StringBuilder("xref\n0 7\n0000000000 65535 f \n");
        for (int offset : offsets) {
            table.append(String.format(Locale.ROOT, "%010d 00000 n \n", offset));
        }
        table.append("trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n").append(xref).append("\n%%EOF\n");
        write(out, table.toString());
        return out.toByteArray();
    }

    private static String color(int rgb, String operator) {
        return String.format(Locale.ROOT, "%.3f %.3f %.3f %s ",
                ((rgb >> 16) & 0xFF) / 255f, ((rgb >> 8) & 0xFF) / 255f, (rgb & 0xFF) / 255f, operator);
    }

    /** Escapes PDF string syntax and replaces characters Helvetica/WinAnsi cannot show. */
    static String escape(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (char c : value.toCharArray()) {
            if (c == '(' || c == ')' || c == '\\') {
                sb.append('\\').append(c);
            } else if (c == '₹') {
                sb.append("Rs.");
            } else if (c >= 32 && c <= 126 || c >= 160 && c <= 255) {
                sb.append(c);
            } else if (c == '\n' || c == '\r' || c == '\t') {
                sb.append(' ');
            } else {
                sb.append('?');
            }
        }
        return sb.toString();
    }

    private static void write(ByteArrayOutputStream out, String value) {
        out.writeBytes(value.getBytes(StandardCharsets.ISO_8859_1));
    }
}
