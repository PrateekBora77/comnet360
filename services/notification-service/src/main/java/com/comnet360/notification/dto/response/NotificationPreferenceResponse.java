package com.comnet360.notification.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferenceResponse {

    private Long prefId;
    private Long userId;
    private Boolean emailEnabled;
    private Boolean inAppEnabled;
    private String categories;
    private LocalDateTime updatedAt;
}