#include <iostream>
#include <string>
#include <vector>

using namespace std;


// ======================================================
// TopicInfo
// ======================================================

class TopicInfo {

private:

    string topic;
    string information;

public:

    // Constructor
    TopicInfo(
        string topic,
        string information
    ) {
        this->topic = topic;
        this->information = information;
    }

    string getTopic() const {
        return topic;
    }

    string getInformation() const {
        return information;
    }
};


// ======================================================
// SpaceImage
// ======================================================

class SpaceImage {

private:

    string imageId;
    string imageTitle;
    string mediaUrl;
    string description;
    string category;
    string source;
    bool video;

public:

    // Constructor
    SpaceImage(
        string id,
        string title,
        string url,
        string description,
        string category,
        string source,
        bool video
    ) {

        this->imageId = id;
        this->imageTitle = title;
        this->mediaUrl = url;
        this->description = description;
        this->category = category;
        this->source = source;
        this->video = video;
    }

    string getId() const {
        return imageId;
    }

    string getTitle() const {
        return imageTitle;
    }

    string getMediaUrl() const {
        return mediaUrl;
    }

    string getDescription() const {
        return description;
    }

    string getCategory() const {
        return category;
    }

    string getSource() const {
        return source;
    }

    bool isVideo() const {
        return video;
    }


    // Operator Overloading
    friend bool operator==(
        const SpaceImage& image1,
        const SpaceImage& image2
    );
};


// Operator Overloading Implementation
bool operator==(
    const SpaceImage& image1,
    const SpaceImage& image2
) {

    return image1.imageId ==
           image2.imageId;
}


// ======================================================
// CelestialDetails
// ======================================================

class CelestialDetails {

private:

    string atmosphere;
    bool hasRings;
    string composition;
    string summary;

public:

    // Constructor 1
    CelestialDetails(
        string atmosphere,
        bool rings,
        string composition,
        string summary
    ) {

        this->atmosphere = atmosphere;
        this->hasRings = rings;
        this->composition = composition;
        this->summary = summary;
    }


    // Constructor 2
    // Constructor Overloading
    CelestialDetails(
        bool rings,
        string composition,
        string summary
    ) {

        this->atmosphere =
            "No atmosphere details available.";

        this->hasRings = rings;
        this->composition = composition;
        this->summary = summary;
    }


    string getAtmosphere() const {
        return atmosphere;
    }

    bool hasRingSystem() const {
        return hasRings;
    }

    string getComposition() const {
        return composition;
    }

    string getSummary() const {
        return summary;
    }
};


// ======================================================
// Abstract Base Class: SpaceEntity
// ======================================================

class SpaceEntity {

protected:

    string id;
    string name;

    // Aggregation
    vector<SpaceImage> gallery;

    // Collection of topics
    vector<TopicInfo> topics;

public:

    SpaceEntity(
        string id,
        string name
    ) {

        this->id = id;
        this->name = name;
    }


    // Virtual Destructor
    virtual ~SpaceEntity() = default;


    string getId() const {
        return id;
    }


    string getName() const {
        return name;
    }


    void addImage(
        const SpaceImage& image
    ) {

        gallery.push_back(image);
    }


    void addTopic(
        const TopicInfo& topic
    ) {

        topics.push_back(topic);
    }


    int getImageCount() const {

        return static_cast<int>(
            gallery.size()
        );
    }


    const vector<TopicInfo>&
    getTopics() const {

        return topics;
    }


    // Pure Virtual Function
    // Makes this class ABSTRACT
    virtual string getSummary() const = 0;
};


// ======================================================
// Planet
// ======================================================

class Planet : public SpaceEntity {

private:

    double massKg;
    double distanceFromSunKm;

    // Composition
    CelestialDetails details;

    string summary;

public:

    // Constructor 1
    Planet(
        string id,
        string name,
        double mass,
        double distance,
        CelestialDetails details,
        string summary
    )
        : SpaceEntity(id, name),
          massKg(mass),
          distanceFromSunKm(distance),
          details(details),
          summary(summary) {
    }


    // Constructor 2
    // Constructor Overloading
    Planet(
        string id,
        string name
    )
        : SpaceEntity(id, name),
          massKg(0),
          distanceFromSunKm(0),
          details(
              false,
              "Unknown",
              "Information not loaded."
          ),
          summary(
              "Planet information is being loaded."
          ) {
    }


    double getMassKg() const {
        return massKg;
    }


    double getDistanceFromSunKm() const {
        return distanceFromSunKm;
    }


    CelestialDetails getDetails() const {
        return details;
    }


    // Function Overriding
    string getSummary() const override {

        return "Planet: " +
               name +
               "\n" +
               summary;
    }
};


// ======================================================
// Main
// ======================================================

int main(
    int argc,
    char* argv[]
) {

    // ------------------------------------------
    // Planet name from Node.js
    // ------------------------------------------

    string planetName = "Earth";

    if (argc > 1) {

        planetName = argv[1];
    }


    // ------------------------------------------
    // CelestialDetails
    // ------------------------------------------

    CelestialDetails details(
        "Nitrogen and Oxygen",
        false,
        "Rock and metal",
        "Terrestrial planet"
    );


    // ------------------------------------------
    // Planet object
    // ------------------------------------------

    Planet planet(
        "P001",
        planetName,
        5.972e24,
        149.6e6,
        details,
        "Planet information obtained from Wikipedia."
    );


    // ------------------------------------------
    // Add Topics
    // ------------------------------------------

    planet.addTopic(
        TopicInfo(
            "Overview",
            "Planetary overview."
        )
    );


    planet.addTopic(
        TopicInfo(
            "Physical Characteristics",
            "Physical characteristics."
        )
    );


    // ------------------------------------------
    // Polymorphism
    // ------------------------------------------

    SpaceEntity* entity =
        &planet;


    // ------------------------------------------
    // Output
    // ------------------------------------------

    cout << "PLANET\n";
    cout << "------\n";

    cout << "Name: "
         << entity->getName()
         << "\n";

    cout << "Summary: "
         << entity->getSummary()
         << "\n";

    cout << "Mass: "
         << planet.getMassKg()
         << " kg\n";

    cout << "Distance from Sun: "
         << planet.getDistanceFromSunKm()
         << " km\n";

    cout << "Atmosphere: "
         << planet
                .getDetails()
                .getAtmosphere()
         << "\n";

    cout << "Topics: "
         << planet.getTopics().size()
         << "\n";


    return 0;
}