"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationType = void 0;
var RelationType;
(function (RelationType) {
    RelationType["HAS_ONE"] = "hasOne";
    RelationType["HAS_MANY"] = "hasMany";
    RelationType["BELONGS_TO"] = "belongsTo";
    RelationType["BELONGS_TO_MANY"] = "belongsToMany";
})(RelationType || (exports.RelationType = RelationType = {}));
