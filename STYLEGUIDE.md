Style Guide
        
This page details the style guide to follow for all contributors. The standards and guidelines set forth are intended to ensure readability and maintainability.

Naming conventions:

To maintain readability, the variable and function names should follow camel case style. Also, names should be spelled out and not shortened, for example:

If you have a function that is meant to save/add user information then
addUserLoginInformation -> is acceptable
addUsrLgnInfo -> this is NOT acceptable

The reason is that we have a diverse set of contributors with various backgrounds, when the function/variables are spelled it, it is easy for everyone to understand what it is.

Assets, such as icons/images:

For icon/images, please provide multiple sizes so that our application can display properly regardless of device size. 

Json format:

When creating a json file, it must be organized for readability. For example:
This is proper but difficult for humans to read:

{ “user”: “UserName123”, “password”: “ngklweg45@”, “contact”: {“phone”:
“1234567890”, “email”: “new@yahoo.com”}} 

Instead use tabs and newline like this, so it is easily readable:
{
    “user”: “UserName123”, “password”: “ngklweg45@”,
    “contact”: {
                “phone”: “1234567890”,
                “email”: “new@yahoo.com” 
                }
}