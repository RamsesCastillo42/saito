
#include <iostream>
#include <algorithm>
#include <fstream>

#include <sparsehash/sparse_hash_map>

using namespace std;

struct StringToIntSerializer {
    bool operator()(std::ofstream* stream, const std::pair<const std::string, int>& value) const {
        size_t sizeSecond = sizeof(value.second);
        size_t sizeFirst = value.first.size();
        stream->write((char*)&sizeFirst, sizeof(sizeFirst));
        stream->write((char*)&value.first, value.first.size());
        stream->write((char*)&value.second, sizeSecond);
        return true;
    }
    bool operator()(std::ifstream* istream, std::pair<const std::string, int>* value) const {
        // Read key
        size_t size = 0;
        istream->read((char*)&size, sizeof(size));
        char * first = new char[size];
        istream->read((char*)&first, size);
        new (&value->first) string(first, size);  // <-- Error

        // Read value
        int second = 0;
        istream->read((char*)&second, sizeof(second));
        new (&value->second) int(second);

        cout<< first << " -> " << second << endl;
        return true;
    }
};

int main(int argc, char* argv[]) {
    google::sparse_hash_map<string, int> users;

    users["John"] = 12345;
    users["Bob"] = 553;
    users["Alice"] = 82200;

    // Write
    std::ofstream* stream = new std::ofstream("data.dat", std::ios::out | std::ios::binary);
    users.serialize(StringToIntSerializer(), stream);
    stream->close();
    delete stream;

    // Read
    std::ifstream* istream = new std::ifstream("data.dat");
    users.unserialize(StringToIntSerializer(), istream);
    istream->close();
    delete istream;
}


