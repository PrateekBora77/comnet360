package com.comnet360.provisioning.dto.response;

import com.comnet360.provisioning.enums.ServiceStatus;
import com.comnet360.provisioning.enums.ServiceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceResponse {

    private Long serviceId;
    private String name;
    private ServiceType type;
    private ServiceStatus status;
    private String configDetails;
    private Long ownerUserId;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}