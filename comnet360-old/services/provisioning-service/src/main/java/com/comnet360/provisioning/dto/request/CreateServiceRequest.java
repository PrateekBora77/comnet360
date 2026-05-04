package com.comnet360.provisioning.dto.request;

import com.comnet360.provisioning.enums.ServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateServiceRequest {

    @NotBlank(message = "Service name is required")
    @Size(max = 150, message = "Name must not exceed 150 characters")
    private String name;

    @NotNull(message = "Service type is required")
    private ServiceType type;

    private String description;

    // JSON string for flexible config — e.g. {"codec":"G711","maxBandwidth":"2Mbps"}
    private String configDetails;
}