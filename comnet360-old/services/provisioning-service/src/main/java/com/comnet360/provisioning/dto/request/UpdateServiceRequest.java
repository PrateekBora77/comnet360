package com.comnet360.provisioning.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateServiceRequest {

    @Size(max = 150, message = "Name must not exceed 150 characters")
    private String name;

    private String description;

    private String configDetails;
}