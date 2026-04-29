package com.comnet360.notification.controller;

import com.comnet360.notification.dto.request.UpdatePreferenceRequest;
import com.comnet360.notification.dto.response.NotificationPreferenceResponse;
import com.comnet360.notification.service.PreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications/preferences")
@RequiredArgsConstructor
public class PreferenceController {

    private final PreferenceService preferenceService;

    // GET /api/notifications/preferences/{userId}
    // Any authenticated user can view preferences
    // (in production, add ownership check via a dedicated userId claim)
    @GetMapping("/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationPreferenceResponse> getPreferences(
            @PathVariable Long userId) {
        return ResponseEntity.ok(
                preferenceService.getPreferences(userId));
    }

    // PUT /api/notifications/preferences/{userId}
    @PutMapping("/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationPreferenceResponse> updatePreferences(
            @PathVariable Long userId,
            @RequestBody UpdatePreferenceRequest request) {
        return ResponseEntity.ok(
                preferenceService.updatePreferences(userId, request));
    }
}