#include <iostream>
#include <string>
#include <vector>
#include <cctype>
#include "simple_json.hpp"

using namespace std;
using json = simplejson::json;

class TopicInfo
{
private:
    string id, title, shortTitle, content;

public:
    TopicInfo() {}
    TopicInfo(const string &id, const string &title, const string &shortTitle, const string &content)
    {
        this->id = id;
        this->title = title;
        this->shortTitle = shortTitle;
        this->content = content;
    }
    string getId() const { return id; }
    string getTitle() const { return title; }
    string getShortTitle() const { return shortTitle; }
    string getContent() const { return content; }
    void setContent(const string &content) { this->content = content; }
    json toJSON() const
    {
        return json{{"id", id}, {"title", title}, {"shortTitle", shortTitle}, {"content", content}};
    }
};

class SpaceImage
{
private:
    string topicId, url, caption, source, sourceUrl;

public:
    SpaceImage() {}
    SpaceImage(const string &topicId, const string &url, const string &caption,
               const string &source, const string &sourceUrl)
    {
        this->topicId = topicId;
        this->url = url;
        this->caption = caption;
        this->source = source;
        this->sourceUrl = sourceUrl;
    }
    string getTopicId() const { return topicId; }
    string getUrl() const { return url; }
    string getCaption() const { return caption; }
    string getSource() const { return source; }
    string getSourceUrl() const { return sourceUrl; }
    json toJSON() const
    {
        return json{
            {"topicId", topicId}, {"url", url}, {"caption", caption}, {"source", {{"name", source}, {"url", sourceUrl}}}};
    }
};

class CelestialDetails
{
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
                     double temperature, const string &atmosphere, const string &composition,
                     bool rings, double rotationPeriod, double orbitalPeriod,
                     const vector<string> &moons)
    {
        this->mass = mass;
        this->radius = radius;
        this->distanceFromSun = distanceFromSun;
        this->gravity = gravity;
        this->temperature = temperature;
        this->atmosphere = atmosphere;
        this->composition = composition;
        this->rings = rings;
        this->rotationPeriod = rotationPeriod;
        this->orbitalPeriod = orbitalPeriod;
        this->moons = moons;
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
    void addMoon(const string &moon) { moons.push_back(moon); }
    json toJSON() const
    {
        return json{
            {"mass", mass}, {"radius", radius}, {"distanceFromSun", distanceFromSun}, {"gravity", gravity}, {"temperature", temperature}, {"atmosphere", atmosphere}, {"composition", composition}, {"rings", rings}, {"rotationPeriod", rotationPeriod}, {"orbitalPeriod", orbitalPeriod}, {"moons", moons}};
    }
};

class SpaceEntity
{
protected:
    string type, summary;

public:
    SpaceEntity() {}
    SpaceEntity(const string &type, const string &summary)
    {
        this->type = type;
        this->summary = summary;
    }
    string getType() const { return type; }
    string getSummary() const { return summary; }
    void setType(const string &type) { this->type = type; }
    void setSummary(const string &summary) { this->summary = summary; }
    virtual void display() const = 0;
    virtual ~SpaceEntity() {}
};

class Planet : public SpaceEntity
{
private:
    CelestialDetails details;
    vector<TopicInfo> topics;
    vector<SpaceImage> images;

public:
    Planet() : SpaceEntity() {}
    Planet(const string &type, const string &summary, const CelestialDetails &details)
        : SpaceEntity(type, summary) { this->details = details; }
    Planet(const string &type, const string &summary) : SpaceEntity(type, summary) {}
    void addTopic(const TopicInfo &topic) { topics.push_back(topic); }
    void addImage(const SpaceImage &image) { images.push_back(image); }
    void setDetails(const CelestialDetails &details) { this->details = details; }
    CelestialDetails getDetails() const { return details; }
    vector<TopicInfo> getTopics() const { return topics; }
    vector<SpaceImage> getImages() const { return images; }
    void display() const override
    {
        cout << type << "\nSummary: " << summary << endl;
    }
    friend ostream &operator<<(ostream &output, const Planet &planet)
    {
        output << "Type: " << planet.type << "\nSummary: " << planet.summary;
        return output;
    }
    bool operator==(const Planet &other) const
    {
        return type == other.type && summary == other.summary;
    }
    json toJSON() const
    {
        json topicArray = json::array();
        for (const auto &topic : topics)
            topicArray.push_back(topic.toJSON());
        json imageArray = json::array();
        for (const auto &image : images)
            imageArray.push_back(image.toJSON());
        return json{{"type", type}, {"summary", summary}, {"details", details.toJSON()}, {"topics", topicArray}, {"images", imageArray}};
    }
};
class Astronaut : public SpaceEntity
{
private:
    CelestialDetails details;
    vector<TopicInfo> topics;
    vector<SpaceImage> images;

public:
    Astronaut() : SpaceEntity() {}

    Astronaut(const string &type, const string &summary, const CelestialDetails &details)
        : SpaceEntity(type, summary)
    {
        this->details = details;
    }

    Astronaut(const string &type, const string &summary)
        : SpaceEntity(type, summary) {}

    void addTopic(const TopicInfo &topic)
    {
        topics.push_back(topic);
    }

    void addImage(const SpaceImage &image)
    {
        images.push_back(image);
    }

    void setDetails(const CelestialDetails &details)
    {
        this->details = details;
    }

    CelestialDetails getDetails() const
    {
        return details;
    }

    vector<TopicInfo> getTopics() const
    {
        return topics;
    }

    vector<SpaceImage> getImages() const
    {
        return images;
    }

    void display() const override
    {
        cout << "Astronaut\nType: " << type << "\nSummary: " << summary << endl;
    }

    friend ostream &operator<<(ostream &output, const Astronaut &astronaut)
    {
        output << "Type: " << astronaut.type << "\nSummary: " << astronaut.summary;
        return output;
    }

    bool operator==(const Astronaut &other) const
    {
        return type == other.type && summary == other.summary;
    }

    json toJSON() const
    {
        json topicArray = json::array();
        for (const auto &topic : topics)
            topicArray.push_back(topic.toJSON());

        json imageArray = json::array();
        for (const auto &image : images)
            imageArray.push_back(image.toJSON());

        return json{
            {"type", type},
            {"summary", summary},
            {"details", details.toJSON()},
            {"topics", topicArray},
            {"images", imageArray}};
    }
};
class Mission : public SpaceEntity
{
private:
    CelestialDetails details;
    vector<TopicInfo> topics;
    vector<SpaceImage> images;

public:
    Mission() : SpaceEntity() {}

    Mission(const string &type, const string &summary, const CelestialDetails &details)
        : SpaceEntity(type, summary)
    {
        this->details = details;
    }

    Mission(const string &type, const string &summary)
        : SpaceEntity(type, summary) {}

    void addTopic(const TopicInfo &topic)
    {
        topics.push_back(topic);
    }

    void addImage(const SpaceImage &image)
    {
        images.push_back(image);
    }

    void setDetails(const CelestialDetails &details)
    {
        this->details = details;
    }

    CelestialDetails getDetails() const
    {
        return details;
    }

    vector<TopicInfo> getTopics() const
    {
        return topics;
    }

    vector<SpaceImage> getImages() const
    {
        return images;
    }

    void display() const override
    {
        cout << "Mission\nType: " << type << "\nSummary: " << summary << endl;
    }

    friend ostream &operator<<(ostream &output, const Mission &mission)
    {
        output << "Type: " << mission.type << "\nSummary: " << mission.summary;
        return output;
    }

    bool operator==(const Mission &other) const
    {
        return type == other.type && summary == other.summary;
    }

    json toJSON() const
    {
        json topicArray = json::array();
        for (const auto &topic : topics)
            topicArray.push_back(topic.toJSON());

        json imageArray = json::array();
        for (const auto &image : images)
            imageArray.push_back(image.toJSON());

        return json{
            {"type", type},
            {"summary", summary},
            {"details", details.toJSON()},
            {"topics", topicArray},
            {"images", imageArray}};
    }
};
string safeString(const json &obj, const string &key, const string &fallback = "")
{
    if (!obj.is_object() || !obj.contains(key) || !obj[key].is_string())
        return fallback;
    return obj[key].get<string>();
}

double safeNumber(const json &obj, const string &key, double fallback = 0.0)
{
    if (!obj.is_object() || !obj.contains(key))
        return fallback;

    const json &value = obj[key];

    if (value.is_number())
        return value.get<double>();

    if (value.is_string())
    {
        try
        {
            return stod(value.get<string>());
        }
        catch (...)
        {
            return fallback;
        }
    }

    return fallback;
}

bool safeBool(const json &obj, const string &key, bool fallback = false)
{
    if (!obj.is_object() || !obj.contains(key))
        return fallback;

    const json &value = obj[key];

    if (value.is_boolean())
        return value.get<bool>();

    if (value.is_string())
    {
        string text = value.get<string>();
        for (char &c : text)
            c = static_cast<char>(tolower(static_cast<unsigned char>(c)));

        return text == "true" || text == "yes" || text == "1";
    }

    if (value.is_number())
        return value.get<double>() != 0.0;

    return fallback;
}

Planet createPlanetFromJSON(const json &data)
{
    string type = safeString(data, "type", "Planet");
    string summary = safeString(data, "summary", "");

    json d = json::object();
    if (data.is_object() && data.contains("details") && data["details"].is_object())
        d = data["details"];

    vector<string> moons;

    if (d.contains("moons") && d["moons"].is_array())
    {
        for (const auto &moon : d["moons"])
        {
            if (moon.is_string())
                moons.push_back(moon.get<string>());
        }
    }

    CelestialDetails details(
        safeNumber(d, "mass"),
        safeNumber(d, "radius"),
        safeNumber(d, "distanceFromSun"),
        safeNumber(d, "gravity"),
        safeNumber(d, "temperature"),
        safeString(d, "atmosphere"),
        safeString(d, "composition"),
        safeBool(d, "rings"),
        safeNumber(d, "rotationPeriod"),
        safeNumber(d, "orbitalPeriod"),
        moons);

    Planet planet(type, summary, details);

    if (data.contains("topics") && data["topics"].is_array())
    {
        for (const auto &topic : data["topics"])
        {
            if (!topic.is_object())
                continue;

            planet.addTopic(TopicInfo(
                safeString(topic, "id"),
                safeString(topic, "title"),
                safeString(topic, "shortTitle"),
                safeString(topic, "content")));
        }
    }

    if (data.contains("images") && data["images"].is_array())
    {
        for (const auto &image : data["images"])
        {
            if (!image.is_object())
                continue;

            json source = json::object();
            if (image.contains("source") && image["source"].is_object())
                source = image["source"];

            planet.addImage(SpaceImage(
                safeString(image, "topicId"),
                safeString(image, "url"),
                safeString(image, "caption"),
                safeString(source, "name", "NASA"),
                safeString(source, "url")));
        }
    }

    return planet;
}


string cleanText(const string &value)
{
    string result;
    bool insideTag = false;
    for (char c : value)
    {
        if (c == '<') { insideTag = true; continue; }
        if (c == '>') { insideTag = false; result += ' '; continue; }
        if (!insideTag) result += c;
    }
    string clean;
    bool space = false;
    for (unsigned char c : result)
    {
        if (isspace(c)) { if (!clean.empty()) space = true; }
        else { if (space) clean += ' '; clean += static_cast<char>(c); space = false; }
    }
    return clean;
}

string makeSummary(const json &topics)
{
    if (!topics.is_array()) return "Space entity information.";
    for (const auto &topic : topics)
    {
        if (topic.is_object() && safeString(topic, "id") == "overview")
        {
            string content = safeString(topic, "content");
            if (content.empty()) content = safeString(topic, "text");
            content = cleanText(content);
            if (content.empty()) break;
            if (content.size() > 100) content = content.substr(0, 100);
            return content;
        }
    }
    return "Space entity information.";
}

json selectHeroImage(const json &images, const string &name, const string &wikiURL)
{
    if (!images.is_array()) return nullptr;
    const json *first = nullptr;
    for (const auto &image : images)
    {
        if (!image.is_object() || safeString(image, "url").empty()) continue;
        if (!first) first = &image;
        if (safeString(image, "topicId") == "overview") { first = &image; break; }
    }
    if (!first) return nullptr;
    json hero = *first;
    if (safeString(hero, "title").empty()) hero["title"] = name;
    if (safeString(hero, "alt").empty()) hero["alt"] = safeString(hero, "title", name);
    if (!hero.contains("source")) hero["source"] = json{{"name", "Wikipedia"}, {"url", wikiURL}};
    return hero;
}

int main()
{
    try
    {
        string input, line;
        while (getline(cin, line))
            input += line;
        if (input.empty())
        {
            cerr << "No JSON input received." << endl;
            return 1;
        }
        json data = json::parse(input);
        if (!data.is_object())
        {
            cerr << "Input JSON must be an object." << endl;
            return 1;
        }

        if (!data.contains("details") || !data["details"].is_object())
            data["details"] = json::object();

        if (!data.contains("topics") || !data["topics"].is_array())
            data["topics"] = json::array();

        if (!data.contains("images") || !data["images"].is_array())
            data["images"] = json::array();
        Planet planet = createPlanetFromJSON(data);
        json output = planet.toJSON();
        output["summary"] = makeSummary(data["topics"]);
        output["heroImage"] = selectHeroImage(data["images"],
            safeString(data, "name", "Space Entity"),
            safeString(data, "wikipediaUrl", ""));
        cout << output.dump();
        return 0;
    }
    catch (const exception &error)
    {
        cerr << "C++ ERROR: " << error.what() << endl;
        return 1;
    }
}