// Space Explorer - C++ object model.
//
// Node sends one JSON object on stdin and reads one JSON object from stdout.
//   Space entity page : {type, name, wikipediaUrl, details, topics, images}
//                       -> {type, summary, heroImage}
//   Astronaut list    : {people:[{id, name, agency, experience}, ...]}
//                       -> {valid:[id, ...]}   (records that pass Astronaut::isValid)
//
// OOP concepts used (from the project guidelines):
//   abstraction       SpaceEntity is abstract (pure virtual getSummary)
//   inheritance       Planet, Mission and Astronaut extend SpaceEntity
//   polymorphism      main() works with SpaceEntity pointers
//   composition       Planet owns its CelestialDetails
//   aggregation       SpaceEntity holds a gallery of SpaceImage, Mission holds Astronaut crew
//   overloading       constructors (CelestialDetails, Astronaut) and operator==

#include <iostream>
#include <memory>
#include <string>
#include <vector>
#include <cctype>
#include "simple_json.hpp"

using namespace std;
using json = simplejson::json;

// ---------- small helpers ----------

string text(const json &obj, const string &key, const string &fallback = "")
{
    return obj.is_object() && obj.contains(key) && obj[key].is_string() ? obj[key].get<string>() : fallback;
}

double number(const json &obj, const string &key)
{
    return obj.is_object() && obj.contains(key) && obj[key].is_number() ? obj[key].get<double>() : 0.0;
}

// Removes HTML tags and collapses white space.
string cleanText(const string &html)
{
    string out;
    bool insideTag = false, space = false;
    for (unsigned char c : html)
    {
        if (c == '<') insideTag = true;
        else if (c == '>') { insideTag = false; space = !out.empty(); }
        else if (!insideTag)
        {
            if (isspace(c)) space = !out.empty();
            else { if (space) out += ' '; out += static_cast<char>(c); space = false; }
        }
    }
    return out;
}

// ---------- value classes ----------

class SpaceImage
{
    json data; // the image exactly as Node sent it (url, caption, source, ...)

public:
    SpaceImage(const json &image) : data(image) {}
    string url() const { return text(data, "url"); }
    string topicId() const { return text(data, "topicId"); }
    const json &raw() const { return data; }

    // Two images are the same when they show the same file for the same topic.
    friend bool operator==(const SpaceImage &a, const SpaceImage &b)
    {
        return a.url() == b.url() && a.topicId() == b.topicId();
    }
};

class TopicInfo
{
    string id, content;

public:
    TopicInfo(const string &id, const string &content) : id(id), content(content) {}
    string getId() const { return id; }
    string getContent() const { return content; }
};

class CelestialDetails
{
    double mass, radius, distanceFromSun;
    string atmosphere, composition;
    bool rings;

public:
    CelestialDetails(double mass, double radius, double distanceFromSun,
                     const string &atmosphere, const string &composition, bool rings)
        : mass(mass), radius(radius), distanceFromSun(distanceFromSun),
          atmosphere(atmosphere), composition(composition), rings(rings) {}

    // Overload: for bodies without an atmosphere value.
    CelestialDetails(double mass, double radius, double distanceFromSun,
                     const string &composition, bool rings)
        : CelestialDetails(mass, radius, distanceFromSun, "No atmosphere details.", composition, rings) {}

    double getMass() const { return mass; }
    double getRadius() const { return radius; }
    double getDistanceFromSun() const { return distanceFromSun; }
    string getAtmosphere() const { return atmosphere; }
    string getComposition() const { return composition; }
    bool hasRings() const { return rings; }
};

// ---------- entities ----------

class SpaceEntity
{
protected:
    string type, name, id;
    vector<TopicInfo> topics;
    vector<SpaceImage> gallery;

public:
    SpaceEntity(const string &type, const string &name, const string &id = "")
        : type(type), name(name), id(id) {}
    virtual ~SpaceEntity() {}

    string getType() const { return type; }
    string getName() const { return name; }
    string getId() const { return id; }

    void addTopic(const TopicInfo &topic) { topics.push_back(topic); }

    void addImage(const SpaceImage &image)
    {
        for (const auto &existing : gallery)
            if (existing == image) return;
        gallery.push_back(image);
    }

    // Every subclass must provide a summary. This shared version reads the overview
    // topic (first 100 characters), so subclasses can reuse it.
    virtual string getSummary() const = 0;

    // The overview image if there is one, otherwise the first image with a url.
    json heroImage(const string &wikipediaUrl) const
    {
        const SpaceImage *pick = nullptr;
        for (const auto &image : gallery)
        {
            if (image.url().empty()) continue;
            if (!pick) pick = &image;
            if (image.topicId() == "overview") { pick = &image; break; }
        }
        if (!pick) return json(nullptr);

        json hero = pick->raw();
        if (text(hero, "title").empty()) hero["title"] = name;
        if (text(hero, "alt").empty()) hero["alt"] = text(hero, "title", name);
        if (!hero.contains("source")) hero["source"] = json{{"name", "Wikipedia"}, {"url", wikipediaUrl}};
        return hero;
    }
};

string SpaceEntity::getSummary() const
{
    for (const auto &topic : topics)
    {
        if (topic.getId() != "overview") continue;
        string content = cleanText(topic.getContent());
        if (content.empty()) break;
        return content.substr(0, 100);
    }
    return "Space entity information.";
}

class Planet : public SpaceEntity
{
    CelestialDetails details; // composition: a planet cannot exist without its details

public:
    Planet(const string &type, const string &name, const CelestialDetails &details)
        : SpaceEntity(type, name), details(details) {}
    CelestialDetails getDetails() const { return details; }
    string getSummary() const override { return SpaceEntity::getSummary(); }
};

class Astronaut : public SpaceEntity
{
    string agency;
    int spaceflights;

public:
    Astronaut(const string &name, const string &agency, int spaceflights, const string &id)
        : SpaceEntity("Astronaut", name, id), agency(agency), spaceflights(spaceflights) {}

    // Overload: an astronaut page only knows the name.
    Astronaut(const string &name) : Astronaut(name, "Not listed", 0, "") {}

    string getAgency() const { return agency; }
    int getSpaceflights() const { return spaceflights; }
    bool isValid() const { return !id.empty() && !name.empty() && spaceflights >= 0; }
    bool operator==(const Astronaut &other) const { return id == other.id; }
    string getSummary() const override { return SpaceEntity::getSummary(); }
};

class Mission : public SpaceEntity
{
    vector<Astronaut> crew; // aggregation: astronauts exist without the mission

public:
    Mission(const string &type, const string &name) : SpaceEntity(type, name) {}

    void addCrewMember(const Astronaut &astronaut)
    {
        for (const auto &member : crew)
            if (member == astronaut) return;
        crew.push_back(astronaut);
    }
    int getCrewCount() const { return static_cast<int>(crew.size()); }
    string getSummary() const override { return SpaceEntity::getSummary(); }
};

// ---------- building objects from JSON ----------

unique_ptr<SpaceEntity> createEntity(const json &data)
{
    string type = text(data, "type", "Planet");
    string name = text(data, "name", "Space Entity");

    unique_ptr<SpaceEntity> entity;
    if (type == "Astronaut")
        entity = make_unique<Astronaut>(name);
    else if (type == "Mission" || type == "Spacecraft" || type == "Space Station")
        entity = make_unique<Mission>(type, name);
    else
    {
        json d = data.contains("details") ? data["details"] : json::object();
        entity = make_unique<Planet>(type, name, CelestialDetails(
            number(d, "mass"), number(d, "radius"), number(d, "distanceFromSun"),
            text(d, "atmosphere"), text(d, "composition"),
            d.contains("rings") && d["rings"].is_boolean() && d["rings"].get<bool>()));
    }

    if (data.contains("topics") && data["topics"].is_array())
        for (const auto &topic : data["topics"])
            if (topic.is_object())
                entity->addTopic(TopicInfo(text(topic, "id"),
                                           text(topic, "content", text(topic, "text"))));

    if (data.contains("images") && data["images"].is_array())
        for (const auto &image : data["images"])
            if (image.is_object())
                entity->addImage(SpaceImage(image));

    return entity;
}

int main()
{
    try
    {
        string input, line;
        while (getline(cin, line))
            input += line;

        json data = json::parse(input);
        if (!data.is_object())
            throw runtime_error("Input JSON must be an object.");

        // Astronaut list: keep only the records that pass Astronaut::isValid().
        if (data.contains("people") && data["people"].is_array())
        {
            vector<Astronaut> accepted;
            json validIds = json::array();
            for (const auto &person : data["people"])
            {
                Astronaut astronaut(text(person, "name"), text(person, "agency", "Not listed"),
                                    static_cast<int>(number(person, "experience")), text(person, "id"));
                bool duplicate = false;
                for (const auto &known : accepted)
                    if (known == astronaut) duplicate = true;
                if (astronaut.isValid() && !duplicate)
                {
                    accepted.push_back(astronaut);
                    validIds.push_back(astronaut.getId());
                }
            }
            cout << json{{"valid", validIds}}.dump();
            return 0;
        }

        // Space entity page: build the right object and let it describe itself.
        unique_ptr<SpaceEntity> entity = createEntity(data);
        cout << json{{"type", entity->getType()},
                     {"summary", entity->getSummary()},
                     {"heroImage", entity->heroImage(text(data, "wikipediaUrl"))}}.dump();
        return 0;
    }
    catch (const exception &error)
    {
        cerr << "C++ ERROR: " << error.what() << endl;
        return 1;
    }
}
