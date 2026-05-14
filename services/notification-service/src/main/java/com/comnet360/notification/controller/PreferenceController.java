package com.comnet360.notification.controller;

import com.comnet360.notification.dto.request.UpdatePreferenceRequest;
import com.comnet360.notification.dto.response.NotificationPreferenceResponse;
import com.comnet360.notification.service.PreferenceService;
import io.swagger.v3.oas.annotations.Parameter;
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
    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #requestingUserId == #userId")
    public ResponseEntity<NotificationPreferenceResponse> getPreferences(
            @PathVariable Long userId,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long requestingUserId) {
        return ResponseEntity.ok(
                preferenceService.getPreferences(userId));
    }

    // PUT /api/notifications/preferences/{userId}
    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #requestingUserId == #userId")
    public ResponseEntity<NotificationPreferenceResponse> updatePreferences(
            @PathVariable Long userId,
            @RequestBody UpdatePreferenceRequest request,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long requestingUserId) {
        return ResponseEntity.ok(
                preferenceService.updatePreferences(userId, request));
    }
}