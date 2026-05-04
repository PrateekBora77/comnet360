package com.comnet360.notification.service;

import com.comnet360.notification.entity.EmailLog;
import com.comnet360.notification.repository.EmailLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender    mailSender;
    private final EmailLogRepository emailLogRepository;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.mail.enabled}")
    private boolean emailEnabled;

    // ── Send Plain Text Email ────────────────────────────────────

    @Async
    public void sendEmail(Long notificationId, String toEmail,
                          String subject, String body) {

        EmailLog emailLog = EmailLog.builder()
                .notificationId(notificationId)
                .recipientEmail(toEmail)
                .subject(subject)
                .status("PENDING")
                .build();

        emailLog = emailLogRepository.save(emailLog);

        if (!emailEnabled) {
            log.info("Email sending disabled. Would have sent to: {} subject: {}",
                    toEmail, subject);
            emailLog.setStatus("SENT");
            emailLog.setSentAt(LocalDateTime.now());
            emailLogRepository.save(emailLog);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);

            emailLog.setStatus("SENT");
            emailLog.setSentAt(LocalDateTime.now());
            emailLogRepository.save(emailLog);

            log.info("Email sent successfully to: {} subject: {}", toEmail, subject);

        } catch (Exception e) {
            log.error("Failed to send email to: {} error: {}", toEmail, e.getMessage());
            emailLog.setStatus("FAILED");
            emailLog.setErrorMessage(e.getMessage());
            emailLogRepository.save(emailLog);
        }
    }

    // ── Send HTML Email ───────────────────────────────────────────

    @Async
    public void sendHtmlEmail(Long notificationId, String toEmail,
                              String subject, String htmlBody) {

        EmailLog emailLog = EmailLog.builder()
                .notificationId(notificationId)
                .recipientEmail(toEmail)
                .subject(subject)
                .status("PENDING")
                .build();

        emailLog = emailLogRepository.save(emailLog);

        if (!emailEnabled) {
            log.info("Email sending disabled. Would have sent HTML to: {}", toEmail);
            emailLog.setStatus("SENT");
            emailLog.setSentAt(LocalDateTime.now());
            emailLogRepository.save(emailLog);
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(mimeMessage);

            emailLog.setStatus("SENT");
            emailLog.setSentAt(LocalDateTime.now());
            emailLogRepository.save(emailLog);

            log.info("HTML email sent to: {}", toEmail);

        } catch (Exception e) {
            log.error("Failed to send HTML email to: {} error: {}", toEmail, e.getMessage());
            emailLog.setStatus("FAILED");
            emailLog.setErrorMessage(e.getMessage());
            emailLogRepository.save(emailLog);
        }
    }

    // ── Build Email Templates ────────────────────────────────────

    public String buildIncidentEmailBody(String incidentTitle,
                                         String severity,
                                         String description) {
        return """
                ComNet360 — Incident Alert
                
                A new incident has been detected on the platform.
                
                Title:       %s
                Severity:    %s
                Description: %s
                
                Please log in to the ComNet360 platform to view details
                and assign resolution actions.
                
                This is an automated notification from ComNet360.
                """.formatted(incidentTitle, severity, description);
    }

    public String buildSlaBreachEmailBody(String serviceName,
                                          String metric,
                                          String actualValue,
                                          String threshold) {
        return """
                ComNet360 — SLA Breach Alert
                
                An SLA threshold has been exceeded.
                
                Service:    %s
                Metric:     %s
                Actual:     %s
                Threshold:  %s
                
                Please investigate the service performance immediately.
                
                This is an automated notification from ComNet360.
                """.formatted(serviceName, metric, actualValue, threshold);
    }

    public String buildGeneralEmailBody(String title, String message) {
        return """
                ComNet360 — Notification
                
                %s
                
                %s
                
                This is an automated notification from ComNet360.
                """.formatted(title, message);
    }
}