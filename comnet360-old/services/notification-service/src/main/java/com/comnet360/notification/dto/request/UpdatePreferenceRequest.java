package com.comnet360.notification.dto.request;

import lombok.Data;

@Data
public class UpdatePreferenceRequest {

    private Boolean emailEnabled;
    private Boolean inAppEnabled;

    // JSON array of categories e.g. ["INCIDENT","SLA_BREACH"]
    // null means receive all
    private String categories;
}