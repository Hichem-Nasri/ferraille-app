package tn.ferraille.analytics;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AnalyticsController {

    public record VisitRequest(String path, String referrer) {
    }

    private final AnalyticsService analyticsService;

    @PostMapping("/api/visits")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void visit(@RequestBody VisitRequest request, HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        String ip = forwarded != null && !forwarded.isBlank() ? forwarded.split(",")[0].trim() : http.getRemoteAddr();
        analyticsService.record(request.path(), request.referrer(), ip, http.getHeader(HttpHeaders.USER_AGENT));
    }

    @GetMapping("/api/admin/visits")
    public AnalyticsService.Summary summary() {
        return analyticsService.summary();
    }
}
