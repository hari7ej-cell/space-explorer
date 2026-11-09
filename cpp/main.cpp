#include "Astronaut.h"
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

static std::vector<std::string> splitTabs(const std::string& line) {
    std::vector<std::string> fields;
    std::stringstream stream(line);
    std::string field;
    while (std::getline(stream, field, '\t')) fields.push_back(field);
    return fields;
}

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        const auto fields = splitTabs(line);
        if (fields.size() < 7) continue;
        int years = 0;
        try { years = std::stoi(fields[6]); } catch (...) { years = 0; }
        Astronaut astronaut(fields[0], fields[1], fields[2], fields[3], fields[4], fields[5], years);
        if (astronaut.isValid()) std::cout << astronaut.getId() << '\n';
    }
    return 0;
}
