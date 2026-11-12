// Space Explorer - C++ object model (Full Lab Concepts Edition)
#include <iostream>
#include <memory>
#include <string>
#include <vector>
#include <cctype>
#include <thread>
#include <mutex>
#include <chrono>
#include "simple_json.hpp"

using namespace std;
using json = simplejson::json;

// ---------- Helpers & Custom Template ----------

// [Lab Topic: Templates] Generic helper function
template <typename T>
void addUnique(vector<T> &list, const T &item) {
    for (const auto &existing : list)
        if (existing == item) return;
    list.push_back(item);
}

string text(const json &obj, const string &key, const string &fallback = "") {
    return obj.is_object() && obj.contains(key) && obj[key].is_string() ? obj[key].get<string>() : fallback;
}

double number(const json &obj, const string &key) {
    return obj.is_object() && obj.contains(key) && obj[key].is_number() ? obj[key].get<double>() : 0.0;
}

string cleanText(const string &html) {
    string out;
    bool inTag = false, space = false;
    for (unsigned char c : html) {
        if (c == '<') inTag = true;
        else if (c == '>') { inTag = false; space = !out.empty(); }
        else if (!inTag) {
            if (isspace(c)) space = !out.empty();
            else { if (space) out += ' '; out += static_cast<char>(c); space = false; }
        }
    }
    return out;
}

// ---------- Value Classes ----------

class SpaceImage {
    json data;
public:
    SpaceImage(const json &image) : data(image) {}
    string url() const { return text(data, "url"); }
    string topicId() const { return text(data, "topicId"); }
    const json &raw() const { return data; }

    // [Lab Topic: Operator Overloading using a Friend Function]
    friend bool operator==(const SpaceImage &a, const SpaceImage &b) {
        return a.url() == b.url() && a.topicId() == b.topicId();
    }
};

class TopicInfo {
    string id, content;
public:
    TopicInfo(const string &id, const string &content) : id(id), content(content) {}
    string getId() const { return id; }
    string getContent() const { return content; }
};

class CelestialDetails {
    double mass, radius, distanceFromSun;
    string atmosphere, composition;
    bool rings;
public:
    CelestialDetails(double m, double r, double d, const string &atm, const string &comp, bool rng)
        : mass(m), radius(r), distanceFromSun(d), atmosphere(atm), composition(comp), rings(rng) {}

    CelestialDetails(double m, double r, double d, const string &comp, bool rng)
        : CelestialDetails(m, r, d, "No atmosphere details.", comp, rng) {}
};

// ---------- Entities ----------

class SpaceEntity {
protected:
    string type, name, id;
    vector<TopicInfo> topics;
    vector<SpaceImage> gallery;
    static int totalEntities; // [Lab Topic: Static Variables]

public:
    // [Lab Topic: Nested Class]
    class Tag {
    public:
        string label;
        Tag(const string &l = "General") : label(l) {}
    };

    SpaceEntity(const string &type, const string &name, const string &id = "")
        : type(type), name(name), id(id) { totalEntities++; }
    virtual ~SpaceEntity() {}

    // [Lab Topic: Static Functions]
    static int getTotalEntities() { return totalEntities; }

    // [Lab Topic: "this" Pointer]
    string getType() const { return this->type; }
    string getName() const { return this->name; }
    string getId() const { return this->id; }

    // [Lab Topic: Method Overloading]
    void addTopic(const TopicInfo &topic) { topics.push_back(topic); }
    void addTopic(const string &tId, const string &content) { topics.push_back(TopicInfo(tId, content)); }

    void addImage(const SpaceImage &image) { addUnique(gallery, image); } // Uses template

    // [Lab Topic: Virtual Function] (Non-pure so Object Slicing can be demonstrated)
    virtual string getSummary() const {
        for (const auto &topic : topics) {
            if (topic.getId() != "overview") continue;
            string content = cleanText(topic.getContent());
            if (!content.empty()) return content.substr(0, 100);
        }
        return "Space entity information.";
    }

    // [Lab Topic: Stream Operators Overloading using a Friend Function]
    friend ostream &operator<<(ostream &os, const SpaceEntity &e) {
        return os << e.type << ": " << e.name;
    }
    friend istream &operator>>(istream &is, SpaceEntity &e) {
        return is >> e.name;
    }

    json heroImage(const string &wikipediaUrl) const {
        const SpaceImage *pick = nullptr;
        for (const auto &img : gallery) {
            if (img.url().empty()) continue;
            if (!pick) pick = &img;
            if (img.topicId() == "overview") { pick = &img; break; }
        }
        if (!pick) return json(nullptr);

        json hero = pick->raw();
        if (text(hero, "title").empty()) hero["title"] = name;
        if (text(hero, "alt").empty()) hero["alt"] = text(hero, "title", name);
        if (!hero.contains("source")) hero["source"] = json{{"name", "Wikipedia"}, {"url", wikipediaUrl}};
        return hero;
    }
};

int SpaceEntity::totalEntities = 0;

// [Lab Topic: Virtual Base Class & Final]
class Planet final : virtual public SpaceEntity {
    CelestialDetails details;
public:
    Planet(const string &type, const string &name, const CelestialDetails &details)
        : SpaceEntity(type, name), details(details) {}
    string getSummary() const override final { return SpaceEntity::getSummary(); }
};

class Astronaut : virtual public SpaceEntity {
    string agency;
    int spaceflights;
public:
    Astronaut(const string &name, const string &agency, int flights, const string &id)
        : SpaceEntity("Astronaut", name, id), agency(agency), spaceflights(flights) {}

    // [Lab Topic: Basic-to-Class Type Casting] (const string -> Astronaut)
    Astronaut(const string &name) : Astronaut(name, "Not listed", 0, "") {}

    // [Lab Topic: Class-to-Basic Type Casting] (Astronaut -> int)
    operator int() const { return spaceflights; }

    // [Lab Topic: Class-to-Class Type Casting] (Astronaut -> SpaceEntity::Tag)
    operator SpaceEntity::Tag() const { return SpaceEntity::Tag(agency); }

    bool isValid() const { return !id.empty() && !name.empty() && spaceflights >= 0; }
    bool operator==(const Astronaut &other) const { return id == other.id; }
};

class Mission : virtual public SpaceEntity {
    vector<Astronaut> crew;
public:
    Mission(const string &type, const string &name) : SpaceEntity(type, name) {}
    void addCrewMember(const Astronaut &a) { addUnique(crew, a); }
};

// ---------- Multithreading (Runnable, Thread Class, Lifecycle, Sync) ----------

class Runnable {
public:
    virtual void run() = 0;
    virtual ~Runnable() {}
};

class Thread : public Runnable {
    thread t;
public:
    void start() { t = thread(&Thread::run, this); }
    void join() { if (t.joinable()) t.join(); }
    static void sleep(int ms) { this_thread::sleep_for(chrono::milliseconds(ms)); }
    static void yield() { this_thread::yield(); }
    void run() override {}
};

class ValidationWorker : public Thread {
    const json &people;
    vector<Astronaut> &accepted;
    json &validIds;
    mutex &mtx;
public:
    ValidationWorker(const json &p, vector<Astronaut> &acc, json &v, mutex &m)
        : people(p), accepted(acc), validIds(v), mtx(m) {}

    void run() override {
        yield();     // Thread method: yield()
        sleep(1);    // Thread method: sleep()
        for (const auto &p : people) {
            Astronaut a(text(p, "name"), text(p, "agency", "Not listed"),
                        static_cast<int>(number(p, "experience")), text(p, "id"));

            int flights = a;                      // Triggers Class-to-Basic casting
            SpaceEntity::Tag tag = a;             // Triggers Class-to-Class casting
            SpaceEntity sliced = a;               // [Lab Topic: Object Slicing] (Derived copied to Base by value)
            (void)flights; (void)tag; (void)sliced;

            lock_guard<mutex> lock(mtx);          // [Lab Topic: Thread Synchronization]
            bool dup = false;
            for (const auto &k : accepted) if (k == a) dup = true;
            if (a.isValid() && !dup) {
                accepted.push_back(a);
                validIds.push_back(a.getId());
            }
        }
    }
};

// ---------- Factory & Main ----------

unique_ptr<SpaceEntity> createEntity(const json &data) {
    string type = text(data, "type", "Planet");
    string name = text(data, "name", "Space Entity");
    unique_ptr<SpaceEntity> entity;

    if (type == "Astronaut")
        entity = make_unique<Astronaut>(name);
    else if (type == "Mission" || type == "Spacecraft" || type == "Space Station")
        entity = make_unique<Mission>(type, name);
    else {
        json d = data.contains("details") ? data["details"] : json::object();
        entity = make_unique<Planet>(type, name, CelestialDetails(
            number(d, "mass"), number(d, "radius"), number(d, "distanceFromSun"),
            text(d, "atmosphere"), text(d, "composition"),
            d.contains("rings") && d["rings"].is_boolean() && d["rings"].get<bool>()));
    }

    if (data.contains("topics") && data["topics"].is_array())
        for (const auto &t : data["topics"])
            if (t.is_object()) entity->addTopic(text(t, "id"), text(t, "content", text(t, "text")));

    if (data.contains("images") && data["images"].is_array())
        for (const auto &img : data["images"])
            if (img.is_object()) entity->addImage(SpaceImage(img));

    return entity;
}

int main() {
    try {
        string input, line;
        while (getline(cin, line)) input += line;

        json data = json::parse(input);
        if (!data.is_object()) throw runtime_error("Input JSON must be an object.");

        if (data.contains("people") && data["people"].is_array()) {
            vector<Astronaut> accepted;
            json validIds = json::array();
            mutex mtx;

            // Run astronaut validation using our custom Thread & Runnable setup
            ValidationWorker worker(data["people"], accepted, validIds, mtx);
            worker.start();
            worker.join();

            cout << json{{"valid", validIds}}.dump();
            return 0;
        }

        unique_ptr<SpaceEntity> entity = createEntity(data);
        cout << json{{"type", entity->getType()},
                     {"summary", entity->getSummary()},
                     {"heroImage", entity->heroImage(text(data, "wikipediaUrl"))}}.dump();
        return 0;
    } catch (const exception &error) {
        cerr << "C++ ERROR: " << error.what() << endl;
        return 1;
    }
}