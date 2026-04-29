package com.comnet360.analytics.service;

import com.comnet360.analytics.dto.response.IncidentSummaryResponse;
import com.comnet360.analytics.dto.response.SlaComplianceResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;

@Slf4j
@Service
public class AnalyticsDataService {

    private final WebClient usageSlaClient;
    private final WebClient incidentClient;
    private final ObjectMapper objectMapper;

    // Internal service identity headers — downstream services trust these
    private static final String INTERNAL_EMAIL = "analytics@comnet360.internal";
    private static final String INTERNAL_ROLE  = "ADMIN";
    private static final String INTERNAL_ID    = "0";

    public AnalyticsDataService(
            @Qualifier("usageSlaClient") WebClient usageSlaClient,
            @Qualifier("incidentClient") WebClient incidentClient,
            ObjectMapper objectMapper) {
        this.usageSlaClient = usageSlaClient;
        this.incidentClient = incidentClient;
        this.objectMapper   = objectMapper;
    }

    // ── SLA Compliance ───────────────────────────────────────────

    public SlaComplianceResponse buildSlaCompliance(Long serviceId,
                                                    LocalDate from,
                                                    LocalDate to) {
        try {
            log.debug("Fetching SLA breaches for serviceId={}", serviceId);

            // Fetch all breaches for the service
            String breachesJson = usageSlaClient.get()
                    .uri("/api/sla/breaches/service/" + serviceId)
                    .header("X-User-Email", INTERNAL_EMAIL)
                    .header("X-User-Role",  INTERNAL_ROLE)
                    .header("X-User-Id",    INTERNAL_ID)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.debug("Breaches response: {}", breachesJson);

            JsonNode breaches = objectMapper.readTree(breachesJson);
            long total      = breaches.size();
            long resolved   = 0;
            long unresolved = 0;

            for (JsonNode breach : breaches) {
                if (breach.path("resolved").asBoolean()) {
                    resolved++;
                } else {
                    unresolved++;
                }
            }

            // Fetch SLA definitions for metric name
            String slasJson = usageSlaClient.get()
                    .uri("/api/sla/service/" + serviceId)
                    .header("X-User-Email", INTERNAL_EMAIL)
                    .header("X-User-Role",  INTERNAL_ROLE)
                    .header("X-User-Id",    INTERNAL_ID)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.debug("SLAs response: {}", slasJson);

            JsonNode slas = objectMapper.readTree(slasJson);
            String metric = slas.size() > 0
                    ? slas.get(0).path("metric").asText("N/A")
                    : "N/A";

            double compliance = total == 0 ? 100.0
                    : Math.round(((double) resolved / total) * 10000.0) / 100.0;

            log.info("SLA compliance for serviceId={}: total={} resolved={} unresolved={} compliance={}%",
                    serviceId, total, resolved, unresolved, compliance);

            return SlaComplianceResponse.builder()
                    .serviceId(serviceId)
                    .metric(metric)
                    .totalBreaches(total)
                    .resolvedBreaches(resolved)
                    .unresolvedBreaches(unresolved)
                    .compliancePercentage(compliance)
                    .fromDate(from)
                    .toDate(to)
                    .build();

        } catch (Exception e) {
            log.error("Error fetching SLA data for serviceId={}: {}",
                    serviceId, e.getMessage(), e);
            return SlaComplianceResponse.builder()
                    .serviceId(serviceId)
                    .metric("N/A")
                    .totalBreaches(0L)
                    .resolvedBreaches(0L)
                    .unresolvedBreaches(0L)
                    .compliancePercentage(100.0)
                    .fromDate(from)
                    .toDate(to)
                    .build();
        }
    }

    // ── Incident Summary ─────────────────────────────────────────

    public IncidentSummaryResponse buildIncidentSummary(LocalDate from,
                                                        LocalDate to) {
        try {
            log.debug("Fetching all incidents from incident-service");

            String incidentsJson = incidentClient.get()
                    .uri("/api/incidents")
                    .header("X-User-Email", INTERNAL_EMAIL)
                    .header("X-User-Role",  INTERNAL_ROLE)
                    .header("X-User-Id",    INTERNAL_ID)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.debug("Incidents response: {}", incidentsJson);

            JsonNode incidents = objectMapper.readTree(incidentsJson);

            long total      = incidents.size();
            long open       = 0, inProgress = 0, resolved = 0, closed = 0;
            long critical   = 0, high = 0, medium = 0, low = 0;
            long mttrTotal  = 0;
            long mttrCount  = 0;

            for (JsonNode incident : incidents) {
                String status   = incident.path("status").asText();
                String severity = incident.path("severity").asText();

                switch (status) {
                    case "OPEN"        -> open++;
                    case "IN_PROGRESS" -> inProgress++;
                    case "RESOLVED"    -> resolved++;
                    case "CLOSED"      -> closed++;
                }

                switch (severity) {
                    case "CRITICAL" -> critical++;
                    case "HIGH"     -> high++;
                    case "MEDIUM"   -> medium++;
                    case "LOW"      -> low++;
                }

                // MTTR calculation
                if (!incident.path("resolvedDate").isNull()
                        && !incident.path("detectedDate").isNull()) {
                    try {
                        java.time.LocalDateTime detected = java.time.LocalDateTime.parse(
                                incident.path("detectedDate").asText());
                        java.time.LocalDateTime resolvedDate = java.time.LocalDateTime.parse(
                                incident.path("resolvedDate").asText());
                        long minutes = java.time.Duration.between(
                                detected, resolvedDate).toMinutes();
                        mttrTotal += minutes;
                        mttrCount++;
                    } catch (Exception ignored) {}
                }
            }

            double avgMttr = mttrCount > 0
                    ? Math.round((double) mttrTotal / mttrCount * 100.0) / 100.0
                    : 0.0;

            log.info("Incident summary: total={} open={} inProgress={} " +
                            "resolved={} closed={} critical={}",
                    total, open, inProgress, resolved, closed, critical);

            return IncidentSummaryResponse.builder()
                    .totalIncidents(total)
                    .openIncidents(open)
                    .inProgressIncidents(inProgress)
                    .resolvedIncidents(resolved)
                    .closedIncidents(closed)
                    .criticalIncidents(critical)
                    .highIncidents(high)
                    .mediumIncidents(medium)
                    .lowIncidents(low)
                    .averageMttrMinutes(avgMttr)
                    .fromDate(from)
                    .toDate(to)
                    .build();

        } catch (Exception e) {
            log.error("Error fetching incident data: {}", e.getMessage(), e);
            return IncidentSummaryResponse.builder()
                    .totalIncidents(0L)
                    .openIncidents(0L)
                    .inProgressIncidents(0L)
                    .resolvedIncidents(0L)
                    .closedIncidents(0L)
                    .criticalIncidents(0L)
                    .highIncidents(0L)
                    .mediumIncidents(0L)
                    .lowIncidents(0L)
                    .averageMttrMinutes(0.0)
                    .fromDate(from)
                    .toDate(to)
                    .build();
        }
    }
}