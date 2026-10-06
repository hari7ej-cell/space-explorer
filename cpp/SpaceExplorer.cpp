#include <iostream>
#include <string>
#include <vector>
#include "simple_json.hpp"

using namespace std;
using json = simplejson::json;

class TopicInfo {
private:
    string id, title, shortTitle, content;
public:
    TopicInfo() {}
    TopicInfo(const string& id, const string& title, const string& shortTitle, const string& content) {
        this->id = id; this->title = title; this->shortTitle = shortTitle; this->content = content;
    }
    string getId() const { return id; }
    string getTitle() const { return title; }
    string getShortTitle() const { return shortTitle; }
    string getContent() const { return content; }
    void setContent(const string& content) { this->content = content; }
    json toJSON() const {
        return json{{"id", id}, {"title", title}, {"shortTitle", shortTitle}, {"content", content}};
    }
};

class SpaceImage {
private:
    string topicId, url, caption, source, sourceUrl;
public:
    SpaceImage() {}
    SpaceImage(const string& topicId, const string& url, const string& caption,
               const string& source, const string& sourceUrl) {
        this->topicId = topicId; this->url = url; this->caption = caption;
        this->source = source; this->sourceUrl = sourceUrl;
    }
    string getTopicId() const { return topicId; }
    string getUrl() const { return url; }
    string getCaption() const { return caption; }
    string getSource() const { return source; }
    string getSourceUrl() const { return sourceUrl; }
    json toJSON() const {
        return json{
            {"topicId", topicId}, {"url", url}, {"caption", caption},
            {"source", {{"name", source}, {"url", sourceUrl}}}
        };
    }
};

class CelestialDetails {
private:
    double mass, radius, distanceFromSun, gravity, temperature;
    string atmosphere, composition;
    bool rings;
    double rotationPeriod, orbitalPeriod;
    vector<string> moons;
public:
    CelestialDetails()
        : mass(0), radius(0), distanceFromSun(0), gravity(0), temperature(0),
          rings(false), rotationPeriod(0), orbitalPeriod(0) {}

    CelestialDetails(double mass, double radius, double distanceFromSun, double gravity,
                     double temperature, const string& atmosphere, const string& composition,
                     bool rings, double rotationPeriod, double orbitalPeriod,
                     const vector<string>& moons) {
        this->mass = mass; this->radius = radius; this->distanceFromSun = distanceFromSun;
        this->gravity = gravity; this->temperature = temperature;
        this->atmosphere = atmosphere; this->composition = composition; this->rings = rings;
        this->rotationPeriod = rotationPeriod; this->orbitalPeriod = orbitalPeriod; this->moons = moons;
    }
    double getMass() const { return mass; }
    double getRadius() const { return radius; }
    double getDistanceFromSun() const { return distanceFromSun; }
    double getGravity() const { return gravity; }
    double getTemperature() const { return temperature; }
    string getAtmosphere() const { return atmosphere; }
    string getComposition() const { return composition; }
    bool hasRings() const { return rings; }
    double getRotationPeriod() const { return rotationPeriod; }
    double getOrbitalPeriod() const { return orbitalPeriod; }
    vector<string> getMoons() const { return moons; }
    void addMoon(const string& moon) { moons.push_back(moon); }
    json toJSON() const {
        return json{
            {"mass", mass}, {"radius", radius}, {"distanceFromSun", distanceFromSun},
            {"gravity", gravity}, {"temperature", temperature}, {"atmosphere", atmosphere},
            {"composition", composition}, {"rings", rings}, {"rotationPeriod", rotationPeriod},
            {"orbitalPeriod", orbitalPeriod}, {"moons", moons}
        };
    }
};

class SpaceEntity {
protected:
    string type, summary;
public:
    SpaceEntity() {}
    SpaceEntity(const string& type, const string& summary) { this->type = type; this->summary = summary; }
    string getType() const { return type; }
    string getSummary() const { return summary; }
    void setType(const string& type) { this->type = type; }
    void setSummary(const string& summary) { this->summary = summary; }
    virtual void display() const = 0;
    virtual ~SpaceEntity() {}
};

class Planet : public SpaceEntity {
private:
    CelestialDetails details;
    vector<TopicInfo> topics;
    vector<SpaceImage> images;
public:
    Planet() : SpaceEntity() {}
    Planet(const string& type, const string& summary, const CelestialDetails& details)
        : SpaceEntity(type, summary) { this->details = details; }
    Planet(const string& type, const string& summary) : SpaceEntity(type, summary) {}
    void addTopic(const TopicInfo& topic) { topics.push_back(topic); }
    void addImage(const SpaceImage& image) { images.push_back(image); }
    void setDetails(const CelestialDetails& details) { this->details = details; }
    CelestialDetails getDetails() const { return details; }
    vector<TopicInfo> getTopics() const { return topics; }
    vector<SpaceImage> getImages() const { return images; }
    void display() const override {
        cout << "Planet\nType: " << type << "\nSummary: " << summary << endl;
    }
    friend ostream& operator<<(ostream& output, const Planet& planet) {
        output << "Type: " << planet.type << "\nSummary: " << planet.summary;
        return output;
    }
    bool operator==(const Planet& other) const {
        return type == other.type && summary == other.summary;
    }
    json toJSON() const {
        json topicArray = json::array();
        for (const auto& topic : topics) topicArray.push_back(topic.toJSON());
        json imageArray = json::array();
        for (const auto& image : images) imageArray.push_back(image.toJSON());
        return json{{"type", type}, {"summary", summary}, {"details", details.toJSON()},
                    {"topics", topicArray}, {"images", imageArray}};
    }
};

Planet createPlanetFromJSON(const json& data) {
    string type = data.value("type", std::string("Planet"));
    string summary = data.value("summary", std::string(""));
    json d = data.value("details", json::object());

    vector<string> moons;
    if (d.contains("moons") && d["moons"].is_array()) {
        for (const auto& moon : d["moons"]) if (moon.is_string()) moons.push_back(moon.get<string>());
    }

    CelestialDetails details(
        d.value("mass", 0.0), d.value("radius", 0.0), d.value("distanceFromSun", 0.0),
        d.value("gravity", 0.0), d.value("temperature", 0.0),
        d.value("atmosphere", std::string("")), d.value("composition", std::string("")), d.value("rings", false),
        d.value("rotationPeriod", 0.0), d.value("orbitalPeriod", 0.0), moons
    );

    Planet planet(type, summary, details);

    if (data.contains("topics") && data["topics"].is_array()) {
        for (const auto& topic : data["topics"]) {
            planet.addTopic(TopicInfo(
                topic.value("id", std::string("")), topic.value("title", std::string("")),
                topic.value("shortTitle", std::string("")), topic.value("content", std::string(""))
            ));
        }
    }

    if (data.contains("images") && data["images"].is_array()) {
        for (const auto& image : data["images"]) {
            json source = image.value("source", json::object());
            planet.addImage(SpaceImage(
                image.value("topicId", std::string("")), image.value("url", std::string("")), image.value("caption", std::string("")),
                source.value("name", std::string("NASA")), source.value("url", std::string(""))
            ));
        }
    }
    return planet;
}

int main() {
    try {
        string input, line;
        while (getline(cin, line)) input += line;
        if (input.empty()) { cerr << "No JSON input received." << endl; return 1; }
        Planet planet = createPlanetFromJSON(json::parse(input));
        cout << planet.toJSON().dump();
        return 0;
    } catch (const exception& error) {
        cerr << "C++ ERROR: " << error.what() << endl;
        return 1;
    }
}
