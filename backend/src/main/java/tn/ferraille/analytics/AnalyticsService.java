package tn.ferraille.analytics;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class AnalyticsService {

    private static final ZoneId TUNIS = ZoneId.of("Africa/Tunis");
    private static final Pattern BOT = Pattern.compile(
            "(?i)bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless|lighthouse|curl|wget|python|java/|go-http|monitor");

    public record Summary(long visitsToday, long visitorsToday, long visits7d, long visitors7d, long visits30d,
                          long visitors30d, long visitsTotal, long buyersToday, long buyers7d,
                          List<Map<String, Object>> daily, List<Map<String, Object>> sources,
                          List<Map<String, Object>> topPages, List<Map<String, Object>> topReferrers,
                          List<Map<String, Object>> devices) {
    }

    private static final String BUYER_PAGES =
            "(path = '/' or path like '/piece/%' or path like '/pieces/%')";

    private final JdbcTemplate jdbc;
    private final byte[] secret = new byte[32];
    private volatile LocalDate saltDay;
    private volatile byte[] dailySalt;

    public AnalyticsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        new SecureRandom().nextBytes(secret);
    }

    public void record(String path, String referrer, String source, String ip, String userAgent) {
        if (path == null || path.isBlank() || !path.startsWith("/") || userAgent == null || BOT.matcher(userAgent).find()) {
            return;
        }
        String cleanPath = path.split("[?#]")[0];
        if (cleanPath.length() > 300) {
            cleanPath = cleanPath.substring(0, 300);
        }
        String device = userAgent.toLowerCase(Locale.ROOT).matches(".*(mobi|android|iphone).*") ? "mobile"
                : userAgent.toLowerCase(Locale.ROOT).contains("ipad") || userAgent.toLowerCase(Locale.ROOT).contains("tablet") ? "tablette" : "ordinateur";
        String cleanSource = source == null ? null : source.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_-]", "");
        if (cleanSource != null && (cleanSource.isBlank() || cleanSource.length() > 40)) {
            cleanSource = null;
        }
        jdbc.update("insert into page_visits (path, visitor, referrer, device, source) values (?, ?, ?, ?, ?)",
                cleanPath, visitorHash(ip, userAgent), referrerHost(referrer), device, cleanSource);
    }

    public Summary summary() {
        return new Summary(
                count("count(*)", "created_at >= date_trunc('day', now() at time zone 'Africa/Tunis') at time zone 'Africa/Tunis'"),
                count("count(distinct visitor)", "created_at >= date_trunc('day', now() at time zone 'Africa/Tunis') at time zone 'Africa/Tunis'"),
                count("count(*)", "created_at >= now() - interval '7 days'"),
                count("count(distinct visitor)", "created_at >= now() - interval '7 days'"),
                count("count(*)", "created_at >= now() - interval '30 days'"),
                count("count(distinct visitor)", "created_at >= now() - interval '30 days'"),
                count("count(*)", "true"),
                count("count(distinct visitor)", BUYER_PAGES + " and created_at >= date_trunc('day', now() at time zone 'Africa/Tunis') at time zone 'Africa/Tunis'"),
                count("count(distinct visitor)", BUYER_PAGES + " and created_at >= now() - interval '7 days'"),
                jdbc.queryForList("""
                        select to_char(created_at at time zone 'Africa/Tunis', 'YYYY-MM-DD') as day,
                               count(*) as visits, count(distinct visitor) as visitors
                        from page_visits where created_at >= now() - interval '30 days'
                        group by 1 order by 1"""),
                jdbc.queryForList("""
                        select source, count(distinct visitor) as visitors, count(*) as visits
                        from page_visits where source is not null and created_at >= now() - interval '30 days'
                        group by source order by visitors desc limit 10"""),
                jdbc.queryForList("""
                        select path, count(*) as visits from page_visits
                        where created_at >= now() - interval '30 days'
                        group by path order by visits desc limit 10"""),
                jdbc.queryForList("""
                        select coalesce(referrer, 'Accès direct') as source, count(distinct visitor) as visitors
                        from page_visits where created_at >= now() - interval '30 days'
                        group by 1 order by visitors desc limit 8"""),
                jdbc.queryForList("""
                        select device, count(distinct visitor) as visitors from page_visits
                        where created_at >= now() - interval '30 days' group by device order by visitors desc"""));
    }

    @Scheduled(cron = "0 30 3 * * *")
    public void purgeOldVisits() {
        jdbc.update("delete from page_visits where created_at < now() - interval '400 days'");
    }

    private long count(String expression, String where) {
        Long value = jdbc.queryForObject("select " + expression + " from page_visits where " + where, Long.class);
        return value == null ? 0 : value;
    }

    private String visitorHash(String ip, String userAgent) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(salt());
            digest.update((ip + "|" + userAgent).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest.digest()).substring(0, 32);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private synchronized byte[] salt() throws Exception {
        LocalDate today = LocalDate.now(TUNIS);
        if (!today.equals(saltDay)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(secret);
            digest.update(today.toString().getBytes(StandardCharsets.UTF_8));
            dailySalt = digest.digest();
            saltDay = today;
        }
        return dailySalt;
    }

    private static String referrerHost(String referrer) {
        if (referrer == null || referrer.isBlank()) {
            return null;
        }
        try {
            String host = URI.create(referrer).getHost();
            if (host == null || host.endsWith("ferraille-tn.com")) {
                return null;
            }
            host = host.toLowerCase(Locale.ROOT).replaceFirst("^(www\\.|m\\.|l\\.|lm\\.)", "");
            if (host.contains("google.")) return "Google";
            if (host.contains("facebook.") || host.equals("fb.com")) return "Facebook";
            if (host.contains("instagram.")) return "Instagram";
            if (host.contains("bing.")) return "Bing";
            return host.length() > 120 ? host.substring(0, 120) : host;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
