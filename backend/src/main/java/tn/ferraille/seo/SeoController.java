package tn.ferraille.seo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;
import tn.ferraille.listing.Listing;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;

@RestController
@RequiredArgsConstructor
@Slf4j
public class SeoController {

    private static final MediaType HTML = new MediaType("text", "html", java.nio.charset.StandardCharsets.UTF_8);

    private final SeoService seoService;

    @GetMapping("/seo/home")
    public ResponseEntity<String> home(@RequestParam(required = false) String q) {
        return html(seoService.home(q));
    }

    @GetMapping("/seo/pieces/{slug}")
    public ResponseEntity<String> category(@PathVariable String slug) {
        return seoService.category(slug).map(this::html).orElseGet(() -> html(seoService.notFound()));
    }

    @GetMapping({"/seo/piece/{id:\\d+}", "/seo/piece/{id:\\d+}/{slug}"})
    public ResponseEntity<String> listing(@PathVariable Long id, @PathVariable Optional<String> slug) {
        Optional<Listing> listing = seoService.findIndexable(id);
        if (listing.isEmpty()) {
            return html(seoService.notFound());
        }
        String canonical = SeoService.listingPath(listing.get());
        if (slug.isEmpty() || !canonical.endsWith("/" + slug.get())) {
            return ResponseEntity.status(HttpStatus.MOVED_PERMANENTLY).location(URI.create(canonical)).build();
        }
        return html(seoService.listing(listing.get()));
    }

    @GetMapping({"/seo/casses", "/seo/casses/{ville}"})
    public ResponseEntity<String> casses(@PathVariable Optional<String> ville) {
        return seoService.casses(ville.orElse(null)).map(this::html).orElseGet(() -> html(seoService.notFound()));
    }

    @GetMapping({"/seo/casse/{id:\\d+}", "/seo/casse/{id:\\d+}/{slug}"})
    public ResponseEntity<String> seller(@PathVariable Long id, @PathVariable Optional<String> slug) {
        Optional<SeoService.SeoPage> page = seoService.seller(id);
        if (page.isEmpty()) {
            return html(seoService.notFound());
        }
        String canonical = page.get().canonicalPath();
        if (!canonical.equals("/casse/" + id + slug.map(s -> "/" + s).orElse(""))) {
            return ResponseEntity.status(HttpStatus.MOVED_PERMANENTLY).location(URI.create(canonical)).build();
        }
        return html(page.get());
    }

    @GetMapping({"/seo/pieces-auto/{make}", "/seo/pieces-auto/{make}/{model}"})
    public ResponseEntity<String> vehicle(@PathVariable String make, @PathVariable Optional<String> model) {
        return seoService.vehicle(make, model.orElse(null)).map(this::html).orElseGet(() -> html(seoService.notFound()));
    }

    @GetMapping("/seo/demandes")
    public ResponseEntity<String> requests() {
        return html(seoService.requests());
    }

    @GetMapping(value = "/seo/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(seoService.sitemap());
    }

    @GetMapping(value = "/seo/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> robots() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(6)).cachePublic())
                .body(seoService.robots());
    }

    @ExceptionHandler({IllegalStateException.class, RestClientException.class})
    public ResponseEntity<String> templateUnavailable(RuntimeException e) {
        log.warn("Rendu SEO indisponible : {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }

    private ResponseEntity<String> html(SeoService.SeoPage page) {
        return ResponseEntity.status(page.status())
                .contentType(HTML)
                .header(HttpHeaders.VARY, "Accept-Encoding")
                .cacheControl(CacheControl.noCache())
                .body(seoService.render(page));
    }
}
