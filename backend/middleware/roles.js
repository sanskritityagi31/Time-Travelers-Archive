// backend/middleware/roles.js
// simple RBAC helper used by server.js
module.exports.requireRole = function (roleName) {
  return (req, res, next) => {
    // server.js attaches req.user from JWT
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Missing token / not authenticated" });

    // admin always allowed
    if (user.role === "admin") return next();

    if (Array.isArray(roleName)) {
      if (roleName.includes(user.role)) return next();
    } else {
      if (user.role === roleName) return next();
    }

    return res.status(403).json({ error: "Insufficient role / permission" });
  };
};
