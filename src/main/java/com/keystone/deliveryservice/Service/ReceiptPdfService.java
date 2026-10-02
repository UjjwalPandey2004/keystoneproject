package com.keystone.deliveryservice.Service;

import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Service;

import com.keystone.deliveryservice.Entity.Payment;
import com.keystone.deliveryservice.Service.pdf.SimplePdf;
import com.keystone.deliveryservice.Service.pdf.SimplePdf.Font;

/** KEYSTONE-branded payment receipt as a one-page A4 PDF. */
@Service
public class ReceiptPdfService {

    private static final int NAVY = 0x0B1235;
    private static final int INDIGO = 0x6366F1;
    private static final int PURPLE = 0xA855F7;
    private static final int SKY = 0x38BDF8;
    private static final int TEXT = 0x0F172A;
    private static final int MUTED = 0x64748B;
    private static final int LINE = 0xE2E8F0;
    private static final int PANEL = 0xF5F7FF;
    private static final int GREEN = 0x059669;
    private static final int WHITE = 0xFFFFFF;
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    public byte[] render(Payment payment) {
        SimplePdf pdf = new SimplePdf();
        float w = SimplePdf.PAGE_WIDTH;
        float h = SimplePdf.PAGE_HEIGHT;

        // Header band with the KEYSTONE mark (hexagon + K) and title.
        pdf.fillRect(0, h - 130, w, 130, NAVY);
        pdf.fillRect(0, h - 134, w / 2, 4, INDIGO).fillRect(w / 2, h - 134, w / 2, 4, PURPLE);
        drawLogo(pdf, 48, h - 105, 58);
        pdf.text("KEYSTONE", 120, h - 68, Font.BOLD, 26, WHITE);
        pdf.text("Field Service Management Platform", 121, h - 88, Font.REGULAR, 10.5f, 0xC7D2FE);
        pdf.textRight("PAYMENT RECEIPT", w - 48, h - 66, Font.BOLD, 14, WHITE);
        pdf.textRight(payment.getReference(), w - 48, h - 86, Font.REGULAR, 10.5f, 0xC7D2FE);

        // Status banner.
        float y = h - 200;
        pdf.fillRect(48, y, w - 96, 44, 0xECFDF5);
        pdf.strokeRect(48, y, w - 96, 44, 0xA7F3D0, 1);
        pdf.text("Payment successful", 66, y + 17, Font.BOLD, 14, GREEN);
        pdf.textRight("Status: PAID", w - 66, y + 17, Font.BOLD, 11, GREEN);

        // Amount.
        y -= 70;
        pdf.text("Amount paid", 48, y + 30, Font.REGULAR, 10, MUTED);
        pdf.text("INR " + payment.getAmount().setScale(2, RoundingMode.HALF_UP).toPlainString(), 48, y, Font.BOLD, 28, TEXT);

        // Details table.
        y -= 36;
        String[][] rows = {
                {"Receipt number", payment.getReference()},
                {"Customer name", payment.getPayer().getUserName()},
                {"Organisation", payment.getCustomer().getCompanyName()},
                {"Email", payment.getPayer().getUserEmail()},
                {"Phone", payment.getPayer().getPhone() != null ? payment.getPayer().getPhone() : "-"},
                {"Service / work order", payment.getWorkOrder().getCode()},
                {"Problem", payment.getWorkOrder().getTitle()},
                {"Service site", payment.getWorkOrder().getSite().getSiteName()},
                {"Payment method", PaymentService.methodLabel(payment)},
                {"Transaction / reference ID", payment.getTransactionRef() != null ? payment.getTransactionRef() : payment.getReference()},
                {"Paid on", format(payment.getPaidAt())},
                {"Confirmed by", payment.getVerifiedBy() != null ? payment.getVerifiedBy().getUserName() : "KEYSTONE"},
                {"Payment status", "PAID"},
        };
        float rowHeight = 30;
        float tableTop = y;
        pdf.fillRect(48, tableTop - rows.length * rowHeight, w - 96, rows.length * rowHeight, PANEL);
        for (int i = 0; i < rows.length; i++) {
            float rowY = tableTop - (i + 1) * rowHeight;
            if (i > 0) {
                pdf.line(48, rowY + rowHeight, w - 48, rowY + rowHeight, LINE, 0.8f);
            }
            pdf.text(rows[i][0], 64, rowY + 11, Font.REGULAR, 10, MUTED);
            pdf.text(truncate(rows[i][1], 58), 220, rowY + 11, Font.BOLD, 10.5f, TEXT);
        }
        pdf.strokeRect(48, tableTop - rows.length * rowHeight, w - 96, rows.length * rowHeight, LINE, 1);

        // Footer.
        pdf.line(48, 92, w - 48, 92, LINE, 1);
        pdf.text("Thank you for choosing KEYSTONE - Meridian Facilities Management.", 48, 72, Font.BOLD, 10, TEXT);
        pdf.text("This receipt was generated electronically on " + format(LocalDateTime.now())
                + " and is valid without a signature.", 48, 56, Font.REGULAR, 8.5f, MUTED);
        pdf.fillRect(0, 0, w / 2, 6, INDIGO).fillRect(w / 2, 0, w / 2, 6, PURPLE);
        return pdf.toBytes();
    }

    // Faceted hexagon with a K, like the web logo.
    private static void drawLogo(SimplePdf pdf, float x, float y, float size) {
        float s = size / 64f;
        float[] hex = {32, 61.5f, 57.5f, 46.75f, 57.5f, 17.25f, 32, 2.5f, 6.5f, 17.25f, 6.5f, 46.75f};
        pdf.fillPolygon(INDIGO, scale(hex, x, y, s));
        pdf.fillPolygon(SKY, scale(new float[] {32, 61.5f, 6.5f, 46.75f, 6.5f, 17.25f, 32, 32}, x, y, s));
        pdf.fillPolygon(PURPLE, scale(new float[] {57.5f, 46.75f, 57.5f, 17.25f, 32, 2.5f, 32, 32}, x, y, s));
        pdf.fillRect(x + 19 * s, y + 16 * s, 8.5f * s, 32 * s, NAVY);
        pdf.fillPolygon(NAVY, scale(new float[] {27.5f, 32.5f, 39.5f, 48, 49.5f, 48, 34, 28.5f}, x, y, s));
        pdf.fillPolygon(NAVY, scale(new float[] {31.5f, 30, 49.5f, 16, 39, 16, 27.5f, 25.5f}, x, y, s));
    }

    // Points are in a 64-unit box (already flipped to PDF's bottom-up axis), placed at x,y.
    private static float[] scale(float[] points, float x, float y, float s) {
        float[] out = new float[points.length];
        for (int i = 0; i < points.length; i += 2) {
            out[i] = x + points[i] * s;
            out[i + 1] = y + points[i + 1] * s;
        }
        return out;
    }

    private static String format(LocalDateTime time) {
        return time == null ? "-" : time.format(DATE_TIME);
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return "-";
        }
        return value.length() <= max ? value : value.substring(0, max - 3) + "...";
    }
}
