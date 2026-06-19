var tenant = context.getVariable("request.header.tenant");

context.setVariable("authserver.ClientID", tenant.concat("_ClientID"));
context.setVariable("authserver.ClientSecret", tenant.concat("_ClientSecret"));
context.setVariable("authserver.tURL", tenant.concat("_tURL"));
context.setVariable("req.tenant",tenant);