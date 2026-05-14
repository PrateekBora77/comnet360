package com.comnet360.notification.controller;

import com.comnet360.notification.dto.response.EmailLogResponse;
import com.comnet360.notification.entity.EmailLog;
import com.comnet360.notification.repository.EmailLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications/email-logs")
@RequiredArgsConstructor
public class EmailLogController {

    private final EmailLogRepository emailLogRepository;

    // GET /api/notifications/email-logs
    // All email logs — Admin and Compliance Officer only
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','COMPLIANCE_OFFICER')")
    public ResponseEntity<List<EmailLogResponse>> getAllLogs() {
        return ResponseEntity.ok(
                emailLogRepository.findAll()
                        .stream().map(this::toResponse)
                        .collect(Collectors.toList()));
    }

    // GET /api/notifications/email-logs/notification/{notificationId}
    @GetMapping("/notification/{notificationId}")
    @PreAuthorize("hasAnyRole('ADMIN','COMPLIANCE_OFFICER')")
    public ResponseEntity<List<EmailLogResponse>> getByNotification(
            @PathVariable Long notificationId) {
        return ResponseEntity.ok(
                emailLogRepository
                        .findByNotificationIdOrderByCreatedAtDesc(notificationId)
                        .stream().map(this::toResponse)
                        .collect(Collectors.toList()));
    }

    // GET /api/notifications/email-logs/failed
    // All failed email deliveries — for debugging
    @GetMapping("/failed")
    @PreAuthorize("hasAnyRole('ADMIN','COMPLIANCE_OFFICER')")
    public ResponseEntity<List<EmailLogResponse>> getFailedLogs() {
        return ResponseEntity.ok(
                emailLogRepository.findByStatusOrderByCreatedAtDesc("FAILED")
                        .stream().map(this::toResponse)
                        .collect(Collectors.toList()));
    }

    private EmailLogResponse toResponse(EmailLog log) {
        return EmailLogResponse.builder()
                .logId(log.getLogId())
                .notificationId(log.getNotificationId())
                .recipientEmail(log.getRecipientEmail())
                .subject(log.getSubject())
                .status(log.getStatus())
                .errorMessage(log.getErrorMessage())
                .sentAt(log.getSentAt())
                .createdAt(log.getCreatedAt())
                .build();
    }
}