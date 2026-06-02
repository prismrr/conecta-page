package runners;

import com.intuit.karate.junit5.Karate;

class KarateApiTest {

    @Karate.Test
    Karate runApiScenarios() {
        String karateTags = System.getProperty("karate.tags");
        Karate runner = Karate.run("classpath:features/inscricoes-upsert.feature");
        if (karateTags != null && !karateTags.isBlank()) {
            return runner.tags(karateTags);
        }
        return runner;
    }
}
