package com.comnet360.analytics.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSnapshotResponse {

    private Long snapshotId;
    private String snapshotType;
    private String data;
    private LocalDateTime capturedAt;
}