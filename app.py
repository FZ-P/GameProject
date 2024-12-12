from flask import Flask, request, jsonify
from flask_cors import CORS
import mariadb

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# Database connection function
def connect_to_db():
    """Connect to the MariaDB database and return the connection."""
    try:
        connection = mariadb.connect(
            host='127.0.0.1',
            port=3306,
            user='root',  # Replace with your MariaDB username
            password='ammu',  # Replace with your MariaDB password
            database='flight_game'  # Replace with your database name
        )
        print("Connected to the MariaDB database!")
        return connection
    except mariadb.Error as e:
        print(f"Error connecting to the database: {e}")
        return None


@app.route('/')
def home():
    """Default route."""
    return "<h1>Welcome to the Flight Game API!</h1>"


@app.route('/airports', methods=['GET'])
def fetch_airports():
    """Fetch all airports from the database."""
    connection = connect_to_db()
    if not connection:
        return jsonify({"error": "Failed to connect to the database"}), 500

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT icao_code, name, country, latitude, longitude, has_charging_station FROM airport")
        airports = []
        for row in cursor.fetchall():
            airports.append({
                "icao_code": row[0],
                "name": row[1],
                "country": row[2],
                "latitude": row[3],
                "longitude": row[4],
                "has_charging_station": row[5],
            })
        return jsonify({"airports": airports})
    except mariadb.Error as e:
        print(f"Error fetching airports: {e}")
        return jsonify({"error": "Error fetching airport data"}), 500
    finally:
        connection.close()


@app.route('/newgame', methods=['GET'])
def newgame():
    """Initialize a new game."""
    player = request.args.get('player')  # Player name
    loc = request.args.get('loc', 'EFHK')  # Starting location default to EFHK (Helsinki)

    if not player:
        return jsonify({"error": "Player name is required"}), 400

    connection = connect_to_db()
    if not connection:
        return jsonify({"error": "Failed to connect to the database"}), 500

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT icao_code, name, latitude, longitude, has_charging_station FROM airport WHERE icao_code = ?", (loc,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": f"Airport with ICAO code '{loc}' not found"}), 404

        # Airport details
        airport = {
            "icao_code": row[0],
            "name": row[1],
            "latitude": row[2],
            "longitude": row[3],
            "has_charging_station": row[4],
        }

        # Simulate the initial game state
        game_status = {
            "name": player,
            "co2_points": 0,
            "diamonds": 0,
            "location": airport,
            "money": 1000,
        }

        # Define example goals
        goals = [
            {"name": "Earn 10 Diamonds", "description": "Collect 10 diamonds by completing tasks", "icon": "/img/goal1.webp", "reached": False},
            {"name": "Reduce CO2", "description": "Fly sustainably to reduce CO2 emissions.", "icon": "/img/goal2.webp", "reached": False}
        ]

        return jsonify({"status": game_status, "goals": goals})
    except mariadb.Error as e:
        print(f"Error initializing the game: {e}")
        return jsonify({"error": "Failed to initialize the game"}), 500
    finally:
        connection.close()


@app.route('/flyto', methods=['GET'])
def fly_to():
    """Handle flying to a new destination."""
    game_id = request.args.get('game')  # Game ID (not currently used in the backend logic)
    dest = request.args.get('dest')  # Destination ICAO code
    consumption = request.args.get('consumption')  # CO2 consumption value

    if not dest or not consumption:
        return jsonify({"error": "Destination and CO2 consumption are required"}), 400

    connection = connect_to_db()
    if not connection:
        return jsonify({"error": "Failed to connect to the database"}), 500

    try:
        cursor = connection.cursor()
        # Fetch destination airport details
        cursor.execute("SELECT icao_code, name, latitude, longitude, has_charging_station FROM airport WHERE icao_code = ?", (dest,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": f"Airport with ICAO code '{dest}' not found"}), 404

        # Simulate the updated game state
        airport = {
            "icao_code": row[0],
            "name": row[1],
            "latitude": row[2],
            "longitude": row[3],
            "has_charging_station": row[4],
        }
        # Update the game state
        game_status = {
            "co2_points": int(consumption),  # Increment CO2 points with the provided consumption
            "diamonds": 5,  # Simulate earning random diamonds
            "money": 950,  # Simulate deducting money for the flight
            "location": airport,  # Update to the new airport
        }
        return jsonify({"status": game_status})
    except mariadb.Error as e:
        print(f"Error in /flyto endpoint: {e}")
        return jsonify({"error": "Failed to process the flight"}), 500
    finally:
        connection.close()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

