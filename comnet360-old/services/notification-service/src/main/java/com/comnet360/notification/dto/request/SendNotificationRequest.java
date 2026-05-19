package com.comnet360.notification.dto.request;

import com.comnet360.notification.enums.NotificationCategory;
import com.comnet360.notification.enums.NotificationChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SendNotificationRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    @NotNull(message = "Category is required")
    private NotificationCategory category;

    @NotNull(message = "Channel is required")
    private NotificationChannel channel;

    // Optional — links notification back to source record
    private Long referenceId;
    private String referenceType;

    // Required only when channel is EMAIL or BOTH
    private String recipientEmail;
}