import os
from flask import Flask
from app.extensions import db, jwt, migrate, cors
from config import config_by_name

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name['default']))

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Register Blueprints
    from app.routes.api_routes import api_bp
    from app.routes.excel_routes import excel_bp
    app.register_blueprint(api_bp)
    app.register_blueprint(excel_bp)
    return app
