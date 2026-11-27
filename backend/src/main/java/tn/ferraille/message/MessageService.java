package tn.ferraille.message;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ferraille.common.ApiException;
import tn.ferraille.seo.Slugs;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class MessageService {

    private static final Set<String> CHANNELS = Set.of("whatsapp", "appel", "messenger");

    public record MessageCreate(@NotBlank @Size(max = 80) String name,
                                @NotBlank @Size(max = 30) String phone,
                                @NotBlank @Size(max = 1000) String body) {
    }

    public record MessageView(Long id, Long listingId, String listingTitle, String listingSlug, String senderName,
                              String senderPhone, String body, Instant createdAt, boolean read) {
    }

    public record AdminMessage(Long id, Long listingId, String listingTitle, String listingSlug, Long sellerId,
                               String sellerName, boolean managedSeller, String senderName, String senderPhone,
                               String body, Instant createdAt, boolean read) {
    }

    public record AdminEvent(Long listingId, String listingTitle, String listingSlug, String sellerName,
                             String channel, Instant createdAt) {
    }

    public record AdminContacts(Map<String, Object> totals, List<Map<String, Object>> byDay,
                                List<AdminMessage> messages, List<AdminEvent> events) {
    }

    private final JdbcTemplate jdbc;

    public MessageService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public void send(Long listingId, Long senderId, MessageCreate request) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "select seller_id, status from listings where id = ?", listingId);
        if (rows.isEmpty()) {
            throw ApiException.notFound("Annonce introuvable");
        }
        Long sellerId = ((Number) rows.get(0).get("seller_id")).longValue();
        if (!"ACTIVE".equals(rows.get(0).get("status"))) {
            throw ApiException.badRequest("Cette annonce n'est plus disponible");
        }
        if (sellerId.equals(senderId)) {
            throw ApiException.badRequest("C'est ton annonce");
        }
        String phone = request.phone().replaceAll("[^0-9+]", "");
        if (phone.replace("+", "").length() < 8) {
            throw ApiException.badRequest("Numéro de téléphone invalide");
        }
        Integer recent = jdbc.queryForObject(
                "select count(*) from messages where sender_phone = ? and created_at > now() - interval '1 hour'",
                Integer.class, phone);
        if (recent != null && recent >= 8) {
            throw ApiException.badRequest("Trop de messages envoyés, réessaie dans une heure");
        }
        jdbc.update("""
                insert into messages (listing_id, seller_id, sender_id, sender_name, sender_phone, body)
                values (?, ?, ?, ?, ?, ?)""",
                listingId, sellerId, senderId, request.name().trim(), phone, request.body().trim());
        jdbc.update("insert into contact_events (listing_id, channel) values (?, 'message')", listingId);
        jdbc.update("update listings set contact_clicks = contact_clicks + 1 where id = ?", listingId);
    }

    public void recordEvent(Long listingId, String channel) {
        String clean = channel == null ? "whatsapp" : channel.toLowerCase(Locale.ROOT);
        if (!CHANNELS.contains(clean)) {
            clean = "whatsapp";
        }
        jdbc.update("insert into contact_events (listing_id, channel) select id, ? from listings where id = ?",
                clean, listingId);
    }

    public List<MessageView> inbox(Long sellerId) {
        return jdbc.query("""
                select m.id, m.listing_id, l.title, m.sender_name, m.sender_phone, m.body, m.created_at, m.read_at
                from messages m join listings l on l.id = m.listing_id
                where m.seller_id = ? order by m.created_at desc limit 200""",
                (rs, i) -> new MessageView(rs.getLong("id"), rs.getLong("listing_id"), rs.getString("title"),
                        Slugs.of(rs.getString("title")), rs.getString("sender_name"), rs.getString("sender_phone"),
                        rs.getString("body"), instant(rs.getTimestamp("created_at")), rs.getTimestamp("read_at") != null),
                sellerId);
    }

    public long unread(Long sellerId) {
        Long count = jdbc.queryForObject("select count(*) from messages where seller_id = ? and read_at is null",
                Long.class, sellerId);
        return count == null ? 0 : count;
    }

    public void markRead(Long sellerId, Long messageId, boolean admin) {
        if (admin) {
            jdbc.update("update messages set read_at = now() where id = ? and read_at is null", messageId);
        } else {
            jdbc.update("update messages set read_at = now() where id = ? and seller_id = ? and read_at is null",
                    messageId, sellerId);
        }
    }

    public AdminContacts adminContacts() {
        Map<String, Object> totals = jdbc.queryForMap("""
                select count(*) filter (where created_at >= date_trunc('day', now() at time zone 'Africa/Tunis') at time zone 'Africa/Tunis') as today,
                       count(*) filter (where created_at >= now() - interval '7 days') as week,
                       count(*) filter (where created_at >= now() - interval '30 days') as month,
                       count(*) filter (where channel = 'whatsapp' and created_at >= now() - interval '30 days') as whatsapp,
                       count(*) filter (where channel = 'appel' and created_at >= now() - interval '30 days') as appel,
                       count(*) filter (where channel = 'messenger' and created_at >= now() - interval '30 days') as messenger,
                       count(*) filter (where channel = 'message' and created_at >= now() - interval '30 days') as message
                from contact_events""");
        List<Map<String, Object>> byDay = jdbc.queryForList("""
                select to_char(created_at at time zone 'Africa/Tunis', 'YYYY-MM-DD') as day, count(*) as contacts
                from contact_events where created_at >= now() - interval '14 days'
                group by 1 order by 1""");
        List<AdminMessage> messages = jdbc.query("""
                select m.id, m.listing_id, l.title, u.id as seller_id,
                       coalesce(nullif(u.shop_name, ''), u.full_name) as seller_name,
                       (u.email is null and u.password_hash is null and u.facebook_id is null) as managed,
                       m.sender_name, m.sender_phone, m.body, m.created_at, m.read_at
                from messages m join listings l on l.id = m.listing_id join users u on u.id = m.seller_id
                order by m.created_at desc limit 100""",
                (rs, i) -> new AdminMessage(rs.getLong("id"), rs.getLong("listing_id"), rs.getString("title"),
                        Slugs.of(rs.getString("title")), rs.getLong("seller_id"), rs.getString("seller_name"),
                        rs.getBoolean("managed"), rs.getString("sender_name"), rs.getString("sender_phone"),
                        rs.getString("body"), instant(rs.getTimestamp("created_at")), rs.getTimestamp("read_at") != null));
        List<AdminEvent> events = jdbc.query("""
                select e.listing_id, l.title, coalesce(nullif(u.shop_name, ''), u.full_name) as seller_name,
                       e.channel, e.created_at
                from contact_events e join listings l on l.id = e.listing_id join users u on u.id = l.seller_id
                order by e.created_at desc limit 100""",
                (rs, i) -> new AdminEvent(rs.getLong("listing_id"), rs.getString("title"), Slugs.of(rs.getString("title")),
                        rs.getString("seller_name"), rs.getString("channel"), instant(rs.getTimestamp("created_at"))));
        return new AdminContacts(totals, byDay, messages, events);
    }

    private static Instant instant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }
}
