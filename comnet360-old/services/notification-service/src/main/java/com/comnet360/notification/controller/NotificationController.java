package com.comnet360.notification.controller;

import com.comnet360.notification.dto.request.SendNotificationRequest;
import com.comnet360.notification.dto.response.NotificationResponse;
import com.comnet360.notification.dto.response.UnreadCountResponse;
import com.comnet360.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // POST /api/notifications — Send a notification
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','NETWORK_ENGINEER')")
    public ResponseEntity<NotificationResponse> sendNotification(
            @Valid @RequestBody SendNotificationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(notificationService.sendNotification(request));
    }

    // GET /api/notifications/user/{userId} — All notifications for a user
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #requestingUserId == #userId")
    public ResponseEntity<List<NotificationResponse>> getForUser(
            @PathVariable Long userId,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long requestingUserId) {
        return ResponseEntity.ok(
                notificationService.getNotificationsForUser(userId));
    }

    // GET /api/notifications/user/{userId}/unread — Only unread
    @GetMapping("/user/{userId}/unread")
    @PreAuthorize("hasRole('ADMIN') or #requestingUserId == #userId")
    public ResponseEntity<List<NotificationResponse>> getUnread(
            @PathVariable Long userId,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long requestingUserId) {
        return ResponseEntity.ok(
                notificationService.getUnreadNotifications(userId));
    }

    // GET /api/notifications/user/{userId}/count — Unread badge count
    @GetMapping("/user/{userId}/count")
    @PreAuthorize("hasRole('ADMIN') or #requestingUserId == #userId")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(
            @PathVariable Long userId,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long requestingUserId) {
        return ResponseEntity.ok(
                notificationService.getUnreadCount(userId));
    }

    // GET /api/notifications/{id}
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationResponse> getById(
            @PathVariable Long id,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long requestingUserId,
            @Parameter(hidden = true) @RequestHeader("X-User-Role") String requestingUserRole) {
        return ResponseEntity.ok(
                notificationService.getNotificationById(id, requestingUserId, requestingUserRole));
    }

    // PUT /api/notifications/{id}/read — Mark single as read
    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long id,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long requestingUserId,
            @Parameter(hidden = true) @RequestHeader("X-User-Role") String requestingUserRole) {
        return ResponseEntity.ok(notificationService.markAsRead(id, requestingUserId, requestingUserRole));
    }

    // PUT /api/notifications/user/{userId}/read-all — Mark all as read
    @PutMapping("/user/{userId}/read-all")
    @PreAuthorize("hasRole('ADMIN') or #requestingUserId == #userId")
    public ResponseEntity<Map<String, String>> markAllAsRead(
            @PathVariable Long userId,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long requestingUserId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(
                Map.of("message", "All notifications marked as read"));
    }
}