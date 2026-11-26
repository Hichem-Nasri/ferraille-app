package tn.ferraille.seo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;
import tn.ferraille.listing.Category;
import tn.ferraille.listing.Listing;
import tn.ferraille.listing.ListingRepository;
import tn.ferraille.listing.ListingStatus;
import tn.ferraille.listing.PartCondition;
import tn.ferraille.listing.VehicleFit;
import tn.ferraille.user.SellerType;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SeoService {

    public static final String SITE_NAME = "Ferraille";
    private static final Duration TEMPLATE_TTL = Duration.ofSeconds(30);
    private static final Pattern TITLE = Pattern.compile("(?is)<title>.*?</title>");
    private static final Pattern SEO_META = Pattern.compile(
            "(?is)<meta\\s+(?:name|property)=\"(?:description|robots|og:[^\"]*|twitter:[^\"]*)\"[^>]*>\\s*");
    private static final Pattern CANONICAL = Pattern.compile("(?is)<link\\s+rel=\"canonical\"[^>]*>\\s*");
    private static final Pattern JSON_LD = Pattern.compile("(?is)<script\\s+type=\"application/ld\\+json\">.*?</script>\\s*");
    private static final Pattern ROOT = Pattern.compile("(?is)<fr-root>\\s*</fr-root>");
    private static final Pattern HEAD_END = Pattern.compile("(?i)</head>");

    public record SeoPage(int status, String title, String description, String canonicalPath, String image,
                         String ogType, boolean noindex, List<Object> jsonLd, String body) {
    }

    private final ListingRepository listingRepository;
    private final tn.ferraille.community.CommunityService communityService;
    private final tn.ferraille.community.PartRequestRepository partRequestRepository;
    private final tn.ferraille.community.VehicleIndex vehicleIndex;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final String publicUrl;
    private final String indexUrl;

    private volatile String cachedTemplate;
    private volatile Instant cachedAt = Instant.EPOCH;

    public SeoService(ListingRepository listingRepository, ObjectMapper objectMapper,
                      tn.ferraille.community.CommunityService communityService,
                      tn.ferraille.community.PartRequestRepository partRequestRepository,
                      tn.ferraille.community.VehicleIndex vehicleIndex,
                      @Value("${ferraille.public-url:http://localhost}") String publicUrl,
                      @Value("${ferraille.frontend-index-url:http://frontend/index.html}") String indexUrl) {
        this.listingRepository = listingRepository;
        this.communityService = communityService;
        this.partRequestRepository = partRequestRepository;
        this.vehicleIndex = vehicleIndex;
        this.objectMapper = objectMapper;
        this.publicUrl = publicUrl.replaceAll("/+$", "");
        this.indexUrl = indexUrl;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(3000);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public String publicUrl() {
        return publicUrl;
    }

    public static String listingPath(Listing l) {
        return "/piece/" + l.getId() + "/" + Slugs.of(l.getTitle());
    }

    @Transactional(readOnly = true)
    public SeoPage home(String query) {
        List<Listing> latest = listingRepository.findByStatusOrderByCreatedAtDesc(ListingStatus.ACTIVE, PageRequest.of(0, 30));
        StringBuilder body = new StringBuilder();
        body.append("<h1>Pièces auto d'occasion en Tunisie</h1>")
                .append("<p>Achète et vends des pièces détachées d'occasion : moteur, carrosserie, phares, jantes, ")
                .append("alternateurs… Publication gratuite, contact direct avec le vendeur par WhatsApp, téléphone ou Messenger.</p>");
        body.append(categoryLinks());
        body.append("<h2>Dernières pièces publiées</h2>").append(listingList(latest));

        Map<String, Object> website = node("WebSite");
        website.put("name", SITE_NAME);
        website.put("url", publicUrl + "/");
        website.put("inLanguage", "fr-TN");

        Map<String, Object> organization = node("Organization");
        organization.put("name", SITE_NAME);
        organization.put("url", publicUrl + "/");
        organization.put("logo", publicUrl + "/icon-512.png");
        organization.put("areaServed", "TN");

        boolean searching = query != null && !query.isBlank();
        return new SeoPage(200,
                "Ferraille — Pièces auto d'occasion en Tunisie | Achat & vente",
                "Pièces détachées auto d'occasion en Tunisie : moteurs, phares, jantes, carrosserie, alternateurs. "
                        + "Particuliers et casses, annonces gratuites, contact direct par WhatsApp.",
                "/", publicUrl + "/og-image.png", "website", searching,
                List.of(website, organization, itemList(latest)), body.toString());
    }

    @Transactional(readOnly = true)
    public Optional<SeoPage> category(String slug) {
        return Category.fromSlug(slug).map(category -> {
            List<Listing> listings = listingRepository.findByStatusAndCategoryOrderByCreatedAtDesc(
                    ListingStatus.ACTIVE, category, PageRequest.of(0, 48));
            String title = "Pièces " + category.seoLabel() + " d'occasion en Tunisie | " + SITE_NAME;
            String description = "Pièces " + category.seoLabel() + " d'occasion à vendre en Tunisie : "
                    + listings.size() + " annonce" + (listings.size() > 1 ? "s" : "")
                    + " de particuliers et de casses, partout en Tunisie. Contact direct avec le vendeur.";
            StringBuilder body = new StringBuilder()
                    .append(breadcrumbHtml(List.of(Map.entry("Accueil", "/"), Map.entry(category.label(), "/pieces/" + category.slug()))))
                    .append("<h1>Pièces ").append(esc(category.seoLabel())).append(" d'occasion en Tunisie</h1>")
                    .append(listings.isEmpty() ? "<p>Aucune pièce pour le moment dans cette catégorie.</p>" : listingList(listings))
                    .append(categoryLinks());
            return new SeoPage(200, title, description, "/pieces/" + category.slug(),
                    listings.isEmpty() || listings.get(0).getPhotos().isEmpty()
                            ? publicUrl + "/og-image.png" : absolute(listings.get(0).getPhotos().get(0)),
                    "website", false,
                    List.of(breadcrumbLd(List.of(Map.entry("Accueil", "/"), Map.entry(category.label(), "/pieces/" + category.slug()))),
                            itemList(listings)),
                    body.toString());
        });
    }

    @Transactional(readOnly = true)
    public Optional<Listing> findIndexable(Long id) {
        return listingRepository.findById(id).filter(l -> l.getStatus() != ListingStatus.ARCHIVED).map(l -> {
            l.getPhotos().size();
            l.getFits().size();
            l.getSeller().getDisplayName();
            return l;
        });
    }

    public SeoPage listing(Listing l) {
        Category category = l.getCategory();
        String vehicles = fitsSentence(l.getFits());
        String title = l.getTitle() + (vehicles.isEmpty() ? "" : " — " + firstFit(l.getFits()))
                + " d'occasion | " + price(l.getPrice()) + " | " + SITE_NAME;
        String description = truncate(l.getTitle() + " d'occasion, " + conditionLabel(l.getCondition()).toLowerCase()
                + ", " + price(l.getPrice()) + " à " + l.getCity() + ". "
                + (vehicles.isEmpty() ? "" : "Compatible " + vehicles + ". ")
                + "Contacte directement le vendeur par WhatsApp ou téléphone.", 160);

        List<Map.Entry<String, String>> crumbs = List.of(
                Map.entry("Accueil", "/"),
                Map.entry(category.label(), "/pieces/" + category.slug()),
                Map.entry(l.getTitle(), listingPath(l)));

        StringBuilder body = new StringBuilder()
                .append(breadcrumbHtml(crumbs))
                .append("<article><h1>").append(esc(l.getTitle())).append("</h1>")
                .append("<p><strong>").append(price(l.getPrice())).append("</strong>")
                .append(l.isNegotiable() ? " · prix négociable" : "")
                .append(" · état : ").append(esc(conditionLabel(l.getCondition())))
                .append(" · ").append(esc(l.getCity())).append("</p>");
        for (String photo : l.getPhotos()) {
            body.append("<img src=\"").append(esc(photo)).append("\" alt=\"")
                    .append(esc(l.getTitle() + " d'occasion")).append("\" loading=\"lazy\" width=\"440\">");
        }
        if (l.getDescription() != null && !l.getDescription().isBlank()) {
            body.append("<h2>Description</h2><p>").append(esc(l.getDescription())).append("</p>");
        }
        if (!l.getFits().isEmpty()) {
            body.append("<h2>Véhicules compatibles</h2><ul>");
            l.getFits().forEach(f -> body.append("<li>").append(esc(fitLabel(f))).append("</li>"));
            body.append("</ul>");
        }
        if (l.getOemReference() != null && !l.getOemReference().isBlank()) {
            body.append("<p>Référence constructeur : ").append(esc(l.getOemReference())).append("</p>");
        }
        body.append("<p>Vendu par ").append(esc(l.getSeller().getDisplayName()))
                .append(l.getSeller().getSellerType() == SellerType.PRO ? " (professionnel)" : " (particulier)")
                .append(". Contacte-le directement par WhatsApp, téléphone ou Messenger.</p>")
                .append("<p><a href=\"/pieces/").append(category.slug()).append("\">Voir toutes les pièces ")
                .append(esc(category.seoLabel())).append(" d'occasion</a></p></article>");

        Map<String, Object> product = node("Product");
        product.put("name", l.getTitle());
        product.put("url", publicUrl + listingPath(l));
        product.put("sku", "FR-" + l.getId());
        if (l.getOemReference() != null && !l.getOemReference().isBlank()) {
            product.put("mpn", l.getOemReference());
        }
        if (!l.getPhotos().isEmpty()) {
            product.put("image", l.getPhotos().stream().map(this::absolute).toList());
        }
        product.put("description", l.getDescription() != null && !l.getDescription().isBlank() ? l.getDescription() : description);
        product.put("category", "Pièces auto > " + category.label());
        product.put("itemCondition", schemaCondition(l.getCondition()));
        if (!l.getFits().isEmpty()) {
            Map<String, Object> brand = node("Brand");
            brand.put("name", l.getFits().get(0).getMake());
            product.put("brand", brand);
        }
        Map<String, Object> offer = node("Offer");
        offer.put("url", publicUrl + listingPath(l));
        offer.put("price", l.getPrice() == null ? null : l.getPrice().setScale(3).toPlainString());
        offer.put("priceCurrency", "TND");
        offer.put("itemCondition", schemaCondition(l.getCondition()));
        offer.put("availability", l.getStatus() == ListingStatus.ACTIVE
                ? "https://schema.org/InStock" : "https://schema.org/SoldOut");
        offer.put("areaServed", "TN");
        Map<String, Object> seller = node(l.getSeller().getSellerType() == SellerType.PRO ? "Organization" : "Person");
        seller.put("name", l.getSeller().getDisplayName());
        offer.put("seller", seller);
        if (l.getPrice() != null) {
            product.put("offers", offer);
        }

        String image = l.getPhotos().isEmpty() ? publicUrl + "/og-image.png" : absolute(l.getPhotos().get(0));
        return new SeoPage(200, title, description, listingPath(l), image, "product", false,
                List.of(product, breadcrumbLd(crumbs)), body.toString());
    }

    public SeoPage notFound() {
        return new SeoPage(404, "Pièce introuvable | " + SITE_NAME,
                "Cette annonce n'existe plus. Découvre d'autres pièces auto d'occasion en Tunisie sur Ferraille.",
                "/", publicUrl + "/og-image.png", "website", true, List.of(),
                "<h1>Pièce introuvable</h1><p>Cette annonce a été retirée.</p>" + categoryLinks());
    }

    public String render(SeoPage page) {
        String template = template();
        String canonical = publicUrl + page.canonicalPath();
        StringBuilder head = new StringBuilder();
        head.append("<title>").append(esc(page.title())).append("</title>\n")
                .append(meta("name", "description", page.description()))
                .append(meta("name", "robots", page.noindex() ? "noindex, follow" : "index, follow, max-image-preview:large"))
                .append("<link rel=\"canonical\" href=\"").append(esc(canonical)).append("\">\n")
                .append(meta("property", "og:site_name", SITE_NAME))
                .append(meta("property", "og:locale", "fr_TN"))
                .append(meta("property", "og:type", page.ogType()))
                .append(meta("property", "og:title", page.title()))
                .append(meta("property", "og:description", page.description()))
                .append(meta("property", "og:url", canonical))
                .append(meta("property", "og:image", page.image()))
                .append(meta("name", "twitter:card", "summary_large_image"))
                .append(meta("name", "twitter:title", page.title()))
                .append(meta("name", "twitter:description", page.description()))
                .append(meta("name", "twitter:image", page.image()));
        for (Object ld : page.jsonLd()) {
            head.append("<script type=\"application/ld+json\">").append(json(ld)).append("</script>\n");
        }
        head.append("<style>fr-root>.seo{display:block;max-width:1240px;margin:0 auto;padding:20px;font-family:Inter,system-ui,sans-serif;color:#0B1F17;line-height:1.5}")
                .append("fr-root>.seo img{max-width:100%;height:auto;border-radius:16px}fr-root>.seo a{color:#0F7A45}</style>\n");

        String html = TITLE.matcher(template).replaceAll("");
        html = SEO_META.matcher(html).replaceAll("");
        html = CANONICAL.matcher(html).replaceAll("");
        html = JSON_LD.matcher(html).replaceAll("");
        html = HEAD_END.matcher(html).replaceFirst(Matcher.quoteReplacement(head + "</head>"));
        html = ROOT.matcher(html).replaceFirst(Matcher.quoteReplacement(
                "<fr-root><main class=\"seo\">" + page.body() + "</main></fr-root>"));
        return html;
    }

    @Transactional(readOnly = true)
    public Optional<SeoPage> casses(String citySlug) {
        List<tn.ferraille.community.CommunityDtos.CasseCard> all = communityService.casses(null);
        String city = null;
        if (citySlug != null) {
            city = all.stream().map(tn.ferraille.community.CommunityDtos.CasseCard::city)
                    .filter(c -> c != null && Slugs.of(c).equals(citySlug)).findFirst().orElse(null);
        }
        String finalCity = city;
        List<tn.ferraille.community.CommunityDtos.CasseCard> cards = city == null ? all
                : all.stream().filter(c -> finalCity.equalsIgnoreCase(c.city())).toList();
        String where = city == null ? " en Tunisie" : " à " + city;
        String path = city == null ? "/casses" : "/casses/" + Slugs.of(city);
        boolean empty = cards.isEmpty();
        String title = "Casses auto" + where + " — pièces d'occasion" + (city == null ? " par ville" : "") + " | " + SITE_NAME;
        String description = (city == null ? "Annuaire des casses auto en Tunisie par gouvernorat" : "Casses auto à " + city)
                + " : " + cards.size() + " casse" + (cards.size() > 1 ? "s" : "")
                + " avec pièces d'occasion en ligne, adresse, horaires et contact WhatsApp direct.";
        List<Map.Entry<String, String>> crumbs = city == null
                ? List.of(Map.entry("Accueil", "/"), Map.entry("Casses", "/casses"))
                : List.of(Map.entry("Accueil", "/"), Map.entry("Casses", "/casses"), Map.entry(city, path));
        StringBuilder body = new StringBuilder(breadcrumbHtml(crumbs))
                .append("<h1>Casses auto").append(esc(where)).append("</h1>");
        if (empty) {
            body.append("<p>Aucune casse en ligne pour le moment.</p>");
        } else {
            body.append("<ul>");
            for (var c : cards) {
                body.append("<li><a href=\"").append(sellerPath(c.id(), c.displayName())).append("\">")
                        .append(esc(c.displayName())).append("</a> — ").append(c.listingsCount()).append(" pièce(s)");
                if (c.city() != null) {
                    body.append(", ").append(esc(c.city()));
                }
                if (c.address() != null) {
                    body.append(", ").append(esc(c.address()));
                }
                body.append("</li>");
            }
            body.append("</ul>");
        }
        body.append(cityLinks(all));
        List<Object> ld = new ArrayList<>();
        ld.add(breadcrumbLd(crumbs));
        Map<String, Object> list = node("ItemList");
        List<Object> items = new ArrayList<>();
        for (int i = 0; i < cards.size(); i++) {
            Map<String, Object> item = node("ListItem");
            item.put("position", i + 1);
            item.put("url", publicUrl + sellerPath(cards.get(i).id(), cards.get(i).displayName()));
            item.put("name", cards.get(i).displayName());
            items.add(item);
        }
        list.put("itemListElement", items);
        ld.add(list);
        if (citySlug != null && city == null) {
            return Optional.empty();
        }
        return Optional.of(new SeoPage(200, title, description, path, publicUrl + "/og-image.png", "website",
                empty && city != null, ld, body.toString()));
    }

    @Transactional(readOnly = true)
    public Optional<SeoPage> seller(Long id) {
        var found = communityService.findSellerProfile(id);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        var s = found.get();
        List<Listing> listings = listingRepository.findAll(
                tn.ferraille.listing.ListingSpecifications.search(new tn.ferraille.listing.ListingSpecifications.Filter(
                        null, null, null, null, null, null, null, null, null, null, id)),
                PageRequest.of(0, 48, org.springframework.data.domain.Sort.by("createdAt").descending())).getContent();
        boolean pro = s.sellerType() == tn.ferraille.user.SellerType.PRO;
        String where = s.city() != null ? " à " + s.city() : " en Tunisie";
        String path = sellerPath(s.id(), s.displayName());
        String title = s.displayName() + " — " + (pro ? "Casse auto" : "Vendeur") + where + ", pièces d'occasion | " + SITE_NAME;
        String description = truncate(s.displayName() + " : " + listings.size() + " pièce(s) auto d'occasion en ligne" + where + ". "
                + (s.address() != null ? "Adresse : " + s.address() + ". " : "")
                + (s.openingHours() != null ? "Horaires : " + s.openingHours() + ". " : "")
                + "Contact direct par WhatsApp.", 300);
        List<Map.Entry<String, String>> crumbs = List.of(Map.entry("Accueil", "/"), Map.entry("Casses", "/casses"),
                Map.entry(s.displayName(), path));
        StringBuilder body = new StringBuilder(breadcrumbHtml(crumbs))
                .append("<h1>").append(esc(s.displayName())).append("</h1>");
        if (s.bio() != null) {
            body.append("<p>").append(esc(s.bio())).append("</p>");
        }
        if (s.address() != null) {
            body.append("<p>Adresse : ").append(esc(s.address())).append("</p>");
        }
        if (s.openingHours() != null) {
            body.append("<p>Horaires : ").append(esc(s.openingHours())).append("</p>");
        }
        body.append("<h2>Pièces en vente</h2>")
                .append(listings.isEmpty() ? "<p>Aucune pièce en ligne pour le moment.</p>" : listingList(listings));
        Map<String, Object> entity = node(pro ? "AutoPartsStore" : "Person");
        entity.put("name", s.displayName());
        entity.put("url", publicUrl + path);
        if (s.address() != null) {
            Map<String, Object> address = node("PostalAddress");
            address.put("streetAddress", s.address());
            if (s.city() != null) {
                address.put("addressLocality", s.city());
            }
            address.put("addressCountry", "TN");
            entity.put("address", address);
        }
        if (pro && s.openingHours() != null) {
            entity.put("openingHours", s.openingHours());
        }
        if (pro && s.rating() != null && s.reviewsCount() > 0) {
            Map<String, Object> rating = node("AggregateRating");
            rating.put("ratingValue", s.rating());
            rating.put("reviewCount", s.reviewsCount());
            entity.put("aggregateRating", rating);
        }
        String image = s.avatarUrl() != null ? s.avatarUrl()
                : listings.isEmpty() || listings.get(0).getPhotos().isEmpty() ? publicUrl + "/og-image.png"
                : absolute(listings.get(0).getPhotos().get(0));
        return Optional.of(new SeoPage(200, title, description, path, image, "profile", listings.isEmpty(),
                List.of(breadcrumbLd(crumbs), entity, itemList(listings)), body.toString()));
    }

    @Transactional(readOnly = true)
    public SeoPage requests() {
        var open = partRequestRepository.findAll(PageRequest.of(0, 50,
                org.springframework.data.domain.Sort.by("createdAt").descending())).getContent().stream()
                .filter(r -> r.getStatus() == tn.ferraille.community.PartRequest.Status.OPEN).toList();
        List<Map.Entry<String, String>> crumbs = List.of(Map.entry("Accueil", "/"), Map.entry("Demandes", "/demandes"));
        StringBuilder body = new StringBuilder(breadcrumbHtml(crumbs))
                .append("<h1>Demandes de pièces auto d'occasion</h1>")
                .append("<p>Les acheteurs décrivent la pièce qu'ils cherchent ; les casses qui l'ont les contactent.</p><ul>");
        for (var r : open) {
            body.append("<li>").append(esc(r.getMake() + " " + r.getModel()))
                    .append(r.getYear() != null ? " " + r.getYear() : "").append(" — ")
                    .append(esc(truncate(r.getDescription(), 140)))
                    .append(r.getCity() != null ? " (" + esc(r.getCity()) + ")" : "").append("</li>");
        }
        body.append("</ul>");
        return new SeoPage(200, "Demandes de pièces auto d'occasion en Tunisie | " + SITE_NAME,
                "Tu cherches une pièce auto d'occasion introuvable ? Publie une demande gratuite : les casses de Tunisie qui l'ont te contactent sur WhatsApp.",
                "/demandes", publicUrl + "/og-image.png", "website", false, List.of(breadcrumbLd(crumbs)), body.toString());
    }

    @Transactional(readOnly = true)
    public Optional<SeoPage> vehicle(String makeSlug, String modelSlug) {
        List<tn.ferraille.community.VehicleIndex.VehicleEntry> all = vehicleIndex.all();
        var found = all.stream().filter(v -> v.makeSlug().equals(makeSlug)
                && (modelSlug == null ? v.modelSlug() == null : modelSlug.equals(v.modelSlug()))).findFirst();
        if (found.isEmpty()) {
            return Optional.empty();
        }
        var v = found.get();
        List<Listing> listings = listingRepository.findAll(
                tn.ferraille.listing.ListingSpecifications.search(new tn.ferraille.listing.ListingSpecifications.Filter(
                        null, null, null, v.make(), v.model(), null, null, null, null, null, null)),
                PageRequest.of(0, 48, org.springframework.data.domain.Sort.by("createdAt").descending())).getContent();
        String label = v.label();
        String title = "Pièces " + label + " d'occasion en Tunisie | " + SITE_NAME;
        String description = truncate("Pièces détachées " + label + " d'occasion à vendre en Tunisie : " + listings.size()
                + " annonce" + (listings.size() > 1 ? "s" : "") + " de casses et de particuliers (moteur, carrosserie, "
                + "optique, électronique…). Contact direct sur WhatsApp.", 300);
        List<Map.Entry<String, String>> crumbs = new ArrayList<>();
        crumbs.add(Map.entry("Accueil", "/"));
        crumbs.add(Map.entry(v.make(), "/pieces-auto/" + v.makeSlug()));
        if (v.model() != null) {
            crumbs.add(Map.entry(v.model(), v.path()));
        }
        StringBuilder body = new StringBuilder(breadcrumbHtml(crumbs))
                .append("<h1>Pièces ").append(esc(label)).append(" d'occasion en Tunisie</h1>")
                .append(listings.isEmpty() ? "<p>Aucune pièce pour le moment.</p>" : listingList(listings));
        List<tn.ferraille.community.VehicleIndex.VehicleEntry> related = all.stream()
                .filter(x -> x.makeSlug().equals(v.makeSlug()) && x.modelSlug() != null && !x.path().equals(v.path()))
                .limit(30).toList();
        if (!related.isEmpty()) {
            body.append("<nav><h2>Autres modèles ").append(esc(v.make())).append("</h2><ul>");
            for (var r : related) {
                body.append("<li><a href=\"").append(r.path()).append("\">Pièces ").append(esc(r.label())).append("</a></li>");
            }
            body.append("</ul></nav>");
        }
        String image = listings.isEmpty() || listings.get(0).getPhotos().isEmpty() ? publicUrl + "/og-image.png"
                : absolute(listings.get(0).getPhotos().get(0));
        return Optional.of(new SeoPage(200, title, description, v.path(), image, "website", listings.isEmpty(),
                List.of(breadcrumbLd(crumbs), itemList(listings)), body.toString()));
    }

    public static String sellerPath(Long id, String name) {
        String slug = Slugs.of(name);
        return "/casse/" + id + (slug.isEmpty() ? "" : "/" + slug);
    }

    private String cityLinks(List<tn.ferraille.community.CommunityDtos.CasseCard> all) {
        java.util.Set<String> cities = new java.util.TreeSet<>();
        all.forEach(c -> {
            if (c.city() != null) {
                cities.add(c.city());
            }
        });
        if (cities.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder("<nav aria-label=\"Villes\"><h2>Casses par ville</h2><ul>");
        for (String c : cities) {
            sb.append("<li><a href=\"/casses/").append(Slugs.of(c)).append("\">Casses auto à ").append(esc(c)).append("</a></li>");
        }
        return sb.append("</ul></nav>").toString();
    }

    @Transactional(readOnly = true)
    public String sitemap() {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" ")
                .append("xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">\n");
        xml.append(url("/", null, "daily", "1.0", List.of()));
        for (Category c : Category.values()) {
            xml.append(url("/pieces/" + c.slug(), null, "daily", "0.8", List.of()));
        }
        xml.append(url("/casses", null, "daily", "0.8", List.of()));
        for (var v : vehicleIndex.all()) {
            xml.append(url(v.path(), null, "daily", v.model() == null ? "0.8" : "0.7", List.of()));
        }
        xml.append(url("/demandes", null, "daily", "0.6", List.of()));
        var casses = communityService.casses(null);
        java.util.Set<String> citySlugs = new java.util.TreeSet<>();
        for (var c : casses) {
            if (c.city() != null) {
                citySlugs.add(Slugs.of(c.city()));
            }
            xml.append(url(sellerPath(c.id(), c.displayName()), null, "weekly", "0.7", List.of()));
        }
        for (String slug : citySlugs) {
            xml.append(url("/casses/" + slug, null, "weekly", "0.7", List.of()));
        }
        for (Listing l : listingRepository.findByStatusOrderByUpdatedAtDesc(ListingStatus.ACTIVE, PageRequest.of(0, 45000))) {
            xml.append(url(listingPath(l), l.getUpdatedAt(), "weekly", "0.6",
                    l.getPhotos().stream().limit(3).map(this::absolute).toList()));
        }
        return xml.append("</urlset>\n").toString();
    }

    public String robots() {
        return """
                User-agent: *
                Allow: /
                Disallow: /api/admin/
                Disallow: /api/me
                Disallow: /api/auth/
                Disallow: /api/alerts
                Disallow: /api/orders
                Disallow: /api/wallet
                Disallow: /admin
                Disallow: /profil
                Disallow: /alertes
                Disallow: /acheter/
                Disallow: /commandes
                Disallow: /portefeuille
                Disallow: /mes-annonces
                Disallow: /vendre
                Disallow: /connexion
                Disallow: /inscription

                Sitemap: %s/sitemap.xml
                """.formatted(publicUrl);
    }

    private String template() {
        String current = cachedTemplate;
        if (current != null && Duration.between(cachedAt, Instant.now()).compareTo(TEMPLATE_TTL) < 0) {
            return current;
        }
        String fresh = restClient.get().uri(indexUrl).retrieve().body(String.class);
        if (fresh == null || !ROOT.matcher(fresh).find()) {
            throw new IllegalStateException("index.html introuvable ou invalide");
        }
        cachedTemplate = fresh;
        cachedAt = Instant.now();
        return fresh;
    }

    private String url(String path, Instant lastmod, String changefreq, String priority, List<String> images) {
        StringBuilder sb = new StringBuilder("  <url><loc>").append(xmlEsc(publicUrl + path)).append("</loc>");
        if (lastmod != null) {
            sb.append("<lastmod>").append(DateTimeFormatter.ISO_LOCAL_DATE.format(lastmod.atOffset(ZoneOffset.UTC))).append("</lastmod>");
        }
        sb.append("<changefreq>").append(changefreq).append("</changefreq><priority>").append(priority).append("</priority>");
        images.forEach(i -> sb.append("<image:image><image:loc>").append(xmlEsc(i)).append("</image:loc></image:image>"));
        return sb.append("</url>\n").toString();
    }

    private String categoryLinks() {
        StringBuilder sb = new StringBuilder("<nav aria-label=\"Catégories\"><h2>Catégories</h2><ul>");
        for (Category c : Category.values()) {
            sb.append("<li><a href=\"/pieces/").append(c.slug()).append("\">Pièces ")
                    .append(esc(c.seoLabel())).append(" d'occasion</a></li>");
        }
        return sb.append("</ul></nav>").toString();
    }

    private String listingList(List<Listing> listings) {
        StringBuilder sb = new StringBuilder("<ul>");
        for (Listing l : listings) {
            sb.append("<li><a href=\"").append(listingPath(l)).append("\">").append(esc(l.getTitle())).append("</a> — ")
                    .append(price(l.getPrice())).append(", ").append(esc(l.getCity()));
            if (!l.getFits().isEmpty()) {
                sb.append(" (").append(esc(firstFit(l.getFits()))).append(")");
            }
            sb.append("</li>");
        }
        return sb.append("</ul>").toString();
    }

    private Map<String, Object> itemList(List<Listing> listings) {
        Map<String, Object> list = node("ItemList");
        List<Object> items = new ArrayList<>();
        for (int i = 0; i < listings.size(); i++) {
            Map<String, Object> item = node("ListItem");
            item.put("position", i + 1);
            item.put("url", publicUrl + listingPath(listings.get(i)));
            item.put("name", listings.get(i).getTitle());
            items.add(item);
        }
        list.put("itemListElement", items);
        return list;
    }

    private String breadcrumbHtml(List<Map.Entry<String, String>> crumbs) {
        StringBuilder sb = new StringBuilder("<nav aria-label=\"Fil d'Ariane\">");
        for (int i = 0; i < crumbs.size(); i++) {
            if (i > 0) {
                sb.append(" › ");
            }
            sb.append("<a href=\"").append(esc(crumbs.get(i).getValue())).append("\">")
                    .append(esc(crumbs.get(i).getKey())).append("</a>");
        }
        return sb.append("</nav>").toString();
    }

    private Map<String, Object> breadcrumbLd(List<Map.Entry<String, String>> crumbs) {
        Map<String, Object> list = node("BreadcrumbList");
        List<Object> items = new ArrayList<>();
        for (int i = 0; i < crumbs.size(); i++) {
            Map<String, Object> item = node("ListItem");
            item.put("position", i + 1);
            item.put("name", crumbs.get(i).getKey());
            item.put("item", publicUrl + crumbs.get(i).getValue());
            items.add(item);
        }
        list.put("itemListElement", items);
        return list;
    }

    private static Map<String, Object> node(String type) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("@context", "https://schema.org");
        map.put("@type", type);
        return map;
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value).replace("</", "<\\/");
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private String absolute(String url) {
        return url.startsWith("http") ? url : publicUrl + url;
    }

    private static String meta(String attr, String key, String value) {
        return "<meta " + attr + "=\"" + key + "\" content=\"" + esc(value) + "\">\n";
    }

    private static String esc(String value) {
        return value == null ? "" : HtmlUtils.htmlEscape(value, "UTF-8");
    }

    private static String xmlEsc(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String price(BigDecimal price) {
        if (price == null) {
            return "Prix à discuter";
        }
        return price.stripTrailingZeros().toPlainString().replace('.', ',') + " DT";
    }

    private static String truncate(String text, int max) {
        return text.length() <= max ? text : text.substring(0, max - 1).replaceAll("\\s+\\S*$", "") + "…";
    }

    private static String firstFit(List<VehicleFit> fits) {
        return fits.isEmpty() ? "" : fits.get(0).getMake() + " " + fits.get(0).getModel();
    }

    private static String fitsSentence(List<VehicleFit> fits) {
        return String.join(", ", fits.stream().limit(3).map(SeoService::fitLabel).toList());
    }

    private static String fitLabel(VehicleFit f) {
        String years = f.getYearFrom() == null && f.getYearTo() == null ? ""
                : " (" + (f.getYearFrom() != null ? f.getYearFrom() : "…") + "–" + (f.getYearTo() != null ? f.getYearTo() : "…") + ")";
        return f.getMake() + " " + f.getModel() + years;
    }

    private static String conditionLabel(PartCondition c) {
        return switch (c) {
            case NEUF -> "Neuf";
            case TRES_BON -> "Très bon état";
            case BON -> "Bon état";
            case POUR_PIECES -> "Pour pièces";
        };
    }

    private static String schemaCondition(PartCondition c) {
        return switch (c) {
            case NEUF -> "https://schema.org/NewCondition";
            case POUR_PIECES -> "https://schema.org/DamagedCondition";
            default -> "https://schema.org/UsedCondition";
        };
    }
}
