#pragma once
#include <string>
#include <vector>
#include <map>
#include <variant>
#include <stdexcept>
#include <sstream>
#include <iomanip>
#include <cctype>
#include <cmath>
#include <initializer_list>

namespace simplejson {
class json {
public:
    using object_t = std::map<std::string,json>;
    using array_t = std::vector<json>;
private:
    std::variant<std::nullptr_t,bool,double,std::string,array_t,object_t> v;
    struct Parser {
        const std::string& s; size_t p=0;
        void ws(){ while(p<s.size() && std::isspace((unsigned char)s[p])) ++p; }
        char peek(){ ws(); if(p>=s.size()) throw std::runtime_error("unexpected end of JSON"); return s[p]; }
        void eat(char c){ ws(); if(p>=s.size()||s[p]!=c) throw std::runtime_error("invalid JSON"); ++p; }
        std::string str(){
            eat('"'); std::string out;
            while(p<s.size()){
                char c=s[p++];
                if(c=='"') return out;
                if(c!='\\'){ out+=c; continue; }
                if(p>=s.size()) throw std::runtime_error("bad escape");
                char e=s[p++];
                switch(e){case '"':out+='"';break;case '\\':out+='\\';break;case '/':out+='/';break;case 'b':out+='\b';break;case 'f':out+='\f';break;case 'n':out+='\n';break;case 'r':out+='\r';break;case 't':out+='\t';break;default: throw std::runtime_error("unsupported escape");}
            }
            throw std::runtime_error("unterminated string");
        }
        double num(){
            ws(); size_t start=p;
            if(s[p]=='-') ++p;
            while(p<s.size()&&std::isdigit((unsigned char)s[p])) ++p;
            if(p<s.size()&&s[p]=='.'){++p;while(p<s.size()&&std::isdigit((unsigned char)s[p]))++p;}
            if(p<s.size()&&(s[p]=='e'||s[p]=='E')){++p;if(p<s.size()&&(s[p]=='+'||s[p]=='-'))++p;while(p<s.size()&&std::isdigit((unsigned char)s[p]))++p;}
            return std::stod(s.substr(start,p-start));
        }
        json value(){
            ws(); char c=peek();
            if(c=='"') return json(str());
            if(c=='{') return object();
            if(c=='[') return array();
            if(c=='t'){ if(s.compare(p,4,"true")) throw std::runtime_error("invalid JSON"); p+=4; return json(true); }
            if(c=='f'){ if(s.compare(p,5,"false")) throw std::runtime_error("invalid JSON"); p+=5; return json(false); }
            if(c=='n'){ if(s.compare(p,4,"null")) throw std::runtime_error("invalid JSON"); p+=4; return json(nullptr); }
            return json(num());
        }
        json array(){
            eat('['); array_t a; ws(); if(peek()==']'){++p;return json(a);} while(true){a.push_back(value());ws();if(peek()==']'){++p;break;}eat(',');} return json(a);
        }
        json object(){
            eat('{'); object_t o; ws(); if(peek()=='}'){++p;return json(o);} while(true){ws();std::string k=str();eat(':');o[k]=value();ws();if(peek()=='}'){++p;break;}eat(',');} return json(o);
        }
    };
    explicit json(object_t o):v(std::move(o)){} explicit json(array_t a):v(std::move(a)){}
public:
    json():v(nullptr){} json(std::initializer_list<std::pair<std::string,json>> init){ object_t o; for(const auto& item:init)o[item.first]=item.second; v=std::move(o); } json(const std::vector<std::string>& a){ array_t x; for(const auto& s:a)x.emplace_back(s); v=std::move(x); } json(std::nullptr_t):v(nullptr){} json(bool b):v(b){} json(double n):v(n){} json(int n):v((double)n){} json(const char* s):v(std::string(s)){} json(const std::string& s):v(s){}
    static json object(){return json(object_t{});} static json array(){return json(array_t{});}
    static json parse(const std::string& s){Parser p{s};json j=p.value();p.ws();if(p.p!=s.size())throw std::runtime_error("trailing JSON data");return j;}
    bool is_array() const{return std::holds_alternative<array_t>(v);} bool is_string() const{return std::holds_alternative<std::string>(v);}
    bool contains(const std::string& k) const{auto o=std::get_if<object_t>(&v);return o&&o->count(k);}
    json& operator[](const std::string& k){return std::get<object_t>(v)[k];} const json& operator[](const std::string& k)const{return std::get<object_t>(v).at(k);}
    void push_back(const json& j){std::get<array_t>(v).push_back(j);} auto begin()const{return std::get<array_t>(v).begin();} auto end()const{return std::get<array_t>(v).end();}
    template<class T> T get()const; template<class T> T value(const std::string& k,const T& def)const{if(!contains(k))return def;return (*this)[k].get<T>();}
    std::string dump()const{return dumpImpl();}
private:
    static std::string esc(const std::string& s){std::ostringstream o;for(char c:s){switch(c){case '"':o<<"\\\"";break;case '\\':o<<"\\\\";break;case '\n':o<<"\\n";break;case '\r':o<<"\\r";break;case '\t':o<<"\\t";break;default:o<<c;}}return o.str();}
    std::string dumpImpl()const{
        if(std::holds_alternative<std::nullptr_t>(v))return "null"; if(auto b=std::get_if<bool>(&v))return *b?"true":"false";
        if(auto n=std::get_if<double>(&v)){std::ostringstream o;o<<std::setprecision(15)<<*n;return o.str();}
        if(auto s=std::get_if<std::string>(&v))return "\""+esc(*s)+"\"";
        if(auto a=std::get_if<array_t>(&v)){std::string o="[";for(size_t i=0;i<a->size();++i){if(i)o+=",";o+=(*a)[i].dumpImpl();}return o+"]";}
        auto& m=std::get<object_t>(v);std::string o="{";bool first=true;for(auto& [k,val]:m){if(!first)o+=",";first=false;o+="\""+esc(k)+"\":"+val.dumpImpl();}return o+"}";
    }
};
template<> inline std::string json::get<std::string>()const{return std::get<std::string>(v);} template<> inline double json::get<double>()const{return std::get<double>(v);} template<> inline bool json::get<bool>()const{return std::get<bool>(v);} template<> inline json json::get<json>()const{return *this;} 
}
