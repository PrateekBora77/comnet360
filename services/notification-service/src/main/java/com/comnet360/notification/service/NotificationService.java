package com.comnet360.notification.service;

import com.comnet360.notification.dto.request.SendNotificationRequest;
import com.comnet360.notification.dto.response.NotificationResponse;
import com.comnet360.notification.dto.response.UnreadCountResponse;
import com.comnet360.notification.entity.Notification;
import com.comnet360.notification.entity.NotificationPreference;
import com.comnet360.notification.enums.NotificationChannel;
import com.comnet360.notification.enums.NotificationStatus;
import com.comnet360.notification.exception.BadRequestException;
import com.comnet360.notification.exception.ResourceNotFoundException;
import com.comnet360.notification.repository.NotificationPreferenceRepository;
import com.comnet360.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository           notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final EmailService                     emailService;

    // ── Send Notification ────────────────────────────────────────

    @Transactional
    public NotificationResponse sendNotification(
            SendNotificationRequest request) {

        // Validate email required when channel includes email
        if ((request.getChannel() == NotificationChannel.EMAIL
                || request.getChannel() == NotificationChannel.BOTH)
                && (request.getRecipientEmail() == null
                || request.getRecipientEmail().isBlank())) {
            throw new BadRequestException(
                    "recipientEmail is required when channel is EMAIL or BOTH");
        }

        // Check user preferences before sending
        boolean shouldSendEmail   = shouldSendEmail(request);
        boolean shouldSendInApp   = shouldSendInApp(request);

        // Save notification record
        Notification notification = Notification.builder()
                .userId(request.getUserId())
                .title(request.getTitle())
                .message(request.getMessage())
                .category(request.getCategory())
                .channel(request.getChannel())
                .status(NotificationStatus.UNREAD)
                .referenceId(request.getReferenceId())
                .referenceType(request.getReferenceType())
                .build();

        notification = notificationRepository.save(notification);
        log.info("Notification saved: id={} userId={} category={}",
                notification.getNotificationId(),
                notification.getUserId(),
                notification.getCategory());

        // Send email asynchronously if required
        if (shouldSendEmail && request.getRecipientEmail() != null) {
            String emailBody = emailService.buildGeneralEmailBody(
                    request.getTitle(), request.getMessage());
            emailService.sendEmail(
                    notification.getNotificationId(),
                    request.getRecipientEmail(),
                    "[ComNet360] " + request.getTitle(),
                    emailBody);
        }

        if (!shouldSendInApp) {
            log.debug("In-app notification suppressed by user preferences");
        }

        return toResponse(notification);
    }

    // ── Read ─────────────────────────────────────────────────────

    public List<NotificationResponse> getNotificationsForUser(Long userId) {
        return notificationRepository
                .findByUserIdOrderByCreatedDateDesc(userId)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<NotificationResponse> getUnreadNotifications(Long userId) {
        return notificationRepository
                .findByUserIdAndStatusOrderByCreatedDateDesc(
                        userId, NotificationStatus.UNREAD)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public UnreadCountResponse getUnreadCount(Long userId) {
        long count = notificationRepository
                .countByUserIdAndStatus(userId, NotificationStatus.UNREAD);
        return UnreadCountResponse.builder()
                .userId(userId)
                .unreadCount(count)
                .build();
    }

    public NotificationResponse getNotificationById(Long notificationId) {
        return toResponse(findById(notificationId));
    }

    // ── Mark as Read ─────────────────────────────────────────────

    @Transactional
    public NotificationResponse markAsRead(Long notificationId) {
        Notification notification = findById(notificationId);
        if (notification.getStatus() == NotificationStatus.UNREAD) {
            notification.setStatus(NotificationStatus.READ);
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
        }
        return toResponse(notification);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository
                .findByUserIdAndStatusOrderByCreatedDateDesc(
                        userId, NotificationStatus.UNREAD);
        unread.forEach(n -> {
            n.setStatus(NotificationStatus.READ);
            n.setReadAt(LocalDateTime.now());
        });
        notificationRepository.saveAll(unread);
        log.info("Marked {} notifications as read for userId={}",
                unread.size(), userId);
    }

    // ── Private Helpers ───────────────────────────────────────────

    private boolean shouldSendEmail(SendNotificationRequest request) {
        if (request.getChannel() == NotificationChannel.IN_APP) return false;
        return preferenceRepository.findByUserId(request.getUserId())
                .map(NotificationPreference::getEmailEnabled)
                .orElse(true); // default: email enabled
    }

    private boolean shouldSendInApp(SendNotificationRequest request) {
        if (request.getChannel() == NotificationChannel.EMAIL) return false;
        return preferenceRepository.findByUserId(request.getUserId())
                .map(NotificationPreference::getInAppEnabled)
                .orElse(true); // default: in-app enabled
    }

    private Notification findById(Long notificationId) {
        return notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification not found with id: " + notificationId));
    }

    public NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .notificationId(n.getNotificationId())
                .userId(n.getUserId())
                .title(n.getTitle())
                .message(n.getMessage())
                .category(n.getCategory())
                .channel(n.getChannel())
                .status(n.getStatus())
                .referenceId(n.getReferenceId())
                .referenceType(n.getReferenceType())
                .createdDate(n.getCreatedDate())
                .readAt(n.getReadAt())
                .build();
    }
}