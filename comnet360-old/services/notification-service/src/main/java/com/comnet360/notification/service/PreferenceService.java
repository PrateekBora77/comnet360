package com.comnet360.notification.service;

import com.comnet360.notification.dto.request.UpdatePreferenceRequest;
import com.comnet360.notification.dto.response.NotificationPreferenceResponse;
import com.comnet360.notification.entity.NotificationPreference;
import com.comnet360.notification.repository.NotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PreferenceService {

    private final NotificationPreferenceRepository preferenceRepository;

    // ── Get Preferences ───────────────────────────────────────────

    public NotificationPreferenceResponse getPreferences(Long userId) {
        NotificationPreference pref = preferenceRepository
                .findByUserId(userId)
                .orElseGet(() -> createDefaultPreferences(userId));
        return toResponse(pref);
    }

    // ── Update Preferences ────────────────────────────────────────

    @Transactional
    public NotificationPreferenceResponse updatePreferences(
            Long userId, UpdatePreferenceRequest request) {

        NotificationPreference pref = preferenceRepository
                .findByUserId(userId)
                .orElseGet(() -> createDefaultPreferences(userId));

        if (request.getEmailEnabled() != null)
            pref.setEmailEnabled(request.getEmailEnabled());
        if (request.getInAppEnabled() != null)
            pref.setInAppEnabled(request.getInAppEnabled());
        if (request.getCategories() != null)
            pref.setCategories(request.getCategories());

        pref = preferenceRepository.save(pref);
        log.info("Preferences updated for userId={}", userId);
        return toResponse(pref);
    }

    // ── Private Helpers ───────────────────────────────────────────

    private NotificationPreference createDefaultPreferences(Long userId) {
        NotificationPreference pref = NotificationPreference.builder()
                .userId(userId)
                .emailEnabled(true)
                .inAppEnabled(true)
                .categories(null)
                .build();
        return preferenceRepository.save(pref);
    }

    private NotificationPreferenceResponse toResponse(
            NotificationPreference pref) {
        return NotificationPreferenceResponse.builder()
                .prefId(pref.getPrefId())
                .userId(pref.getUserId())
                .emailEnabled(pref.getEmailEnabled())
                .inAppEnabled(pref.getInAppEnabled())
                .categories(pref.getCategories())
                .updatedAt(pref.getUpdatedAt())
                .build();
    }
}