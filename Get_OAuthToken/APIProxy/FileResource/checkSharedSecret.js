var envsecret = context.getVariable("private.shared.secret");
var reqsecret = context.getVariable("request.header.secret");

if (envsecret != reqsecret)
    throw 'Incorrect Shared Secret';