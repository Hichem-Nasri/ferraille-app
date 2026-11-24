package tn.ferraille.community;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tn.ferraille.seo.Slugs;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class VehicleIndex {

    public record VehicleEntry(String make, String model, String makeSlug, String modelSlug, long count) {
        public String path() {
            return "/pieces-auto/" + makeSlug + (modelSlug == null ? "" : "/" + modelSlug);
        }

        public String label() {
            return model == null ? make : make + " " + model;
        }
    }

    private final JdbcTemplate jdbc;

    public List<VehicleEntry> all() {
        List<VehicleEntry> models = new ArrayList<>();
        Map<String, long[]> makeCounts = new LinkedHashMap<>();
        Map<String, String> makeNames = new LinkedHashMap<>();
        jdbc.query("""
                select min(f.make) as make, min(f.model) as model, count(distinct l.id) as c
                from listing_fits f join listings l on l.id = f.listing_id
                where l.status = 'ACTIVE'
                group by lower(trim(f.make)), lower(trim(f.model))
                order by c desc
                """, rs -> {
            String make = rs.getString("make").trim();
            String model = rs.getString("model").trim();
            String makeSlug = Slugs.of(make);
            if (makeSlug.isEmpty()) {
                return;
            }
            makeNames.putIfAbsent(makeSlug, make);
            makeCounts.computeIfAbsent(makeSlug, k -> new long[1])[0] += rs.getLong("c");
            String modelSlug = Slugs.of(model);
            if (!modelSlug.isEmpty() && model.length() >= 2) {
                models.add(new VehicleEntry(make, model, makeSlug, modelSlug, rs.getLong("c")));
            }
        });
        List<VehicleEntry> result = new ArrayList<>();
        makeCounts.forEach((slug, c) -> result.add(new VehicleEntry(makeNames.get(slug), null, slug, null, c[0])));
        result.sort((a, b) -> Long.compare(b.count(), a.count()));
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (VehicleEntry m : models) {
            if (seen.add(m.makeSlug() + "/" + m.modelSlug())) {
                result.add(m);
            }
        }
        return result;
    }

    public Optional<VehicleEntry> find(String makeSlug, String modelSlug) {
        return all().stream()
                .filter(v -> v.makeSlug().equals(makeSlug)
                        && (modelSlug == null ? v.modelSlug() == null : modelSlug.equals(v.modelSlug())))
                .findFirst();
    }
}
