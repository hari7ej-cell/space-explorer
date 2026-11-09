#ifndef ASTRONAUT_H
#define ASTRONAUT_H

#include <string>

// If your project already has an Astronaut class, keep that class and merge
// the fields/methods below into it instead of creating a second class.
class Astronaut {
private:
    std::string id;
    std::string name;
    std::string agency;
    std::string nationality;
    std::string mission;
    std::string role;
    int experienceYears;

public:
    Astronaut()
        : id(""), name(""), agency("Not listed"), nationality("Not listed"),
          mission("Not listed"), role("Astronaut"), experienceYears(0) {}

    Astronaut(const std::string& idValue, const std::string& nameValue,
              const std::string& agencyValue, const std::string& nationalityValue,
              const std::string& missionValue, const std::string& roleValue,
              int yearsValue)
        : id(idValue), name(nameValue), agency(agencyValue), nationality(nationalityValue),
          mission(missionValue), role(roleValue), experienceYears(yearsValue) {}

    void setId(const std::string& value) { id = value; }
    void setName(const std::string& value) { name = value; }
    void setAgency(const std::string& value) { agency = value; }
    void setNationality(const std::string& value) { nationality = value; }
    void setMission(const std::string& value) { mission = value; }
    void setRole(const std::string& value) { role = value; }
    void setExperienceYears(int value) { experienceYears = value; }

    const std::string& getId() const { return id; }
    const std::string& getName() const { return name; }
    const std::string& getAgency() const { return agency; }
    const std::string& getNationality() const { return nationality; }
    const std::string& getMission() const { return mission; }
    const std::string& getRole() const { return role; }
    int getExperienceYears() const { return experienceYears; }

    bool isValid() const {
        return !id.empty() && !name.empty() && experienceYears >= 0;
    }

    std::string displayDetails() const {
        return name + " | " + role + " | " + nationality + " | " + agency + " | " + mission;
    }
};

#endif
