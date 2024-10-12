//using Dapper;
//using Microsoft.Data.Sqlite;

//namespace MangaCount.Server.Repositories.Config
//{
//    public static class DatabaseUtilities
//    {
//        public static async Task<bool> InitializeDBAsync(this IWebApplication app)
//        {
//            var connectionString = app.Configuration.GetConnectionString("DefaultConnection");

//            var createSQL = @"CREATE TABLE IF NOT EXISTS Customer (
//            ID INTEGER PRIMARY KEY AUTOINCREMENT,
//            FirstName TEXT,
//            LastName TEXT,
//            DOB DATE,
//            Email TEXT
//        );";

//            var insertSQL = @"
//           INSERT INTO Customer (FirstName, LastName, DOB, Email)
//           VALUES 
//                ('Tony', 'Stark', '1970-05-29', 'tony.stark@example.com'),
//                ('Bruce', 'Wayne', '1972-11-11', 'bruce.wayne@example.com'),
//                ('Peter', 'Parker', '1995-08-10', 'peter.parker@example.com'),
//                ('Diana', 'Prince', '1985-04-02', 'diana.prince@example.com'),
//                ('Clark', 'Kent', '1980-07-18', 'clark.kent@example.com'),
//                ('Natasha', 'Romanoff', '1983-06-25', 'natasha.romanoff@example.com'),
//                ('Wade', 'Wilson', '1977-02-19', 'wade.wilson@example.com'),
//                ('Hal', 'Jordan', '1988-09-05', 'hal.jordan@example.com'),
//                ('Steve', 'Rogers', '1920-07-04', 'steve.rogers@example.com'),
//                ('Selina', 'Kyle', '1982-12-08', 'selina.kyle@example.com');";

//            using var connection = new SqliteConnection(connectionString);
//            connection.Open();

//            using var transaction = connection.BeginTransaction();

//            try
//            {
//                await connection.ExecuteAsync(createSQL, transaction: transaction);

//                // Check if the Customer table exists
//                var tableExists = await connection.QueryFirstOrDefaultAsync<int>(
//                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Customer';", transaction: transaction);

//                if (tableExists > 0)
//                {
//                    // Table exists and populated, no need to seed database again
//                    return true;
//                }

//                await connection.ExecuteAsync(insertSQL, transaction: transaction);

//                // Commit the transaction if everything is successful
//                transaction.Commit();
//                connection.Close();
//                return true;
//            }
//            catch (Exception ex)
//            {
//                Console.WriteLine(ex.Message);

//                // An error occurred, rollback the transaction
//                transaction.Rollback();
//                connection.Close();
//                return false;
//            }
//        }
//    }
//}
