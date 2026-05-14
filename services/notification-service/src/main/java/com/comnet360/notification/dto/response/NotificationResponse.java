package com.comnet360.notification.dto.response;

import com.comnet360.notification.enums.NotificationCategory;
import com.comnet360.notification.enums.NotificationChannel;
import com.comnet360.notification.enums.NotificationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private Long notificationId;
    private Long userId;
    private String title;
    private String message;
    private NotificationCategory category;
    private NotificationChannel channel;
    private NotificationStatus status;
    private Long referenceId;
    private String referenceType;
    private LocalDateTime createdDate;
    private LocalDateTime readAt;
}