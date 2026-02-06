 Database Setup Documentation (By Davies)

Supabase Database Creation & Configuration

As part of my contribution to the project, I was responsible for creating and setting up the database using Supabase, which serves as our backend service for authentication, data storage, and API access.

To begin, I created a Supabase project and configured the environment for our application. This included generating the Project URL, anon key, and verifying the project’s region and organization settings to ensure that everything aligns with the group’s needs.




Database Setup Process

1. Created a new Supabase project under our group’s workspace.


2. Configured the project URL and public API key (anon key) which will be used by the frontend to interact with the backend securely.


3. Set up the initial database schema, including a test table used to confirm that the connection between our application and Supabase was working correctly.


4. Verified that the project settings, authentication settings, and API permissions were configured properly for safe and restricted access.






Environment Configuration

After the database was set up, I prepared the environment variables needed for the project:

NEXT_PUBLIC_SUPABASE_URL – Used by our application to connect to the database.

NEXT_PUBLIC_SUPABASE_ANON_KEY – Allows public access for basic operations while keeping sensitive permissions secure.


These variables were set up in the .env.local file and properly ignored using .gitignore to prevent accidental exposure on GitHub.



Testing the Connection

To make sure everything was running correctly:

I created a simple test table in the database.

Connected the project through the Supabase client library.

Performed a basic “Select” query to confirm the frontend could read from the database without errors.


This successfully verified that the Supabase setup was correct and ready for the team to build on.




Summary of My Contribution

Created the Supabase project

Configured API keys and project settings

Set up initial database table

Prepared environment variables

Tested the connection between app and database


This forms the foundation for the data layer of our project, ensuring that the rest of the team can work smoothly with a functional backend.
