package module6;

import de.fhpotsdam.unfolding.UnfoldingMap;
import de.fhpotsdam.unfolding.data.PointFeature;
import de.fhpotsdam.unfolding.data.ShapeFeature;
import de.fhpotsdam.unfolding.geo.Location;
import de.fhpotsdam.unfolding.marker.Marker;
import de.fhpotsdam.unfolding.marker.SimpleLinesMarker;
import de.fhpotsdam.unfolding.providers.MBTilesMapProvider;
import de.fhpotsdam.unfolding.utils.MapUtils;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import parsing.ParseFeed;


/** An applet that shows airports (and routes)
 * on a world map.  
 * @author Adam Setters and the UC San Diego Intermediate Software Development
 * MOOC team
 *
 */
public class AirportMap extends PApplet {
	private static final boolean offline = true;
	private static final String mbTilesString = "data/blankLight-1-3.mbtiles";
	private static final int WINDOW_WIDTH = 1200;
	private static final int WINDOW_HEIGHT = 800;
	private static final int ROUTE_COLOR_BLUE = 255;
	private static final int ROUTE_COLOR_GREEN = 120;
	private static final int ROUTE_COLOR_RED = 0;
	private static final int ROUTE_STROKE_WEIGHT = 4;
	
	UnfoldingMap map;
	private List<Marker> airportList;
	private List<ShapeFeature> routes;
	private List<Marker> routeList;
	private HashMap<Integer, Location> airportLocations;
	private CommonMarker lastSelected;
	private CommonMarker lastClicked;
	
	public void setup() {
		// Use JAVA2D in WSL/Linux to avoid JOGL module-access crashes.
		size(WINDOW_WIDTH, WINDOW_HEIGHT);
		
		// setting up map and default events
		if (offline) {
			map = new UnfoldingMap(this, 0, 0, WINDOW_WIDTH, WINDOW_HEIGHT, new MBTilesMapProvider(mbTilesString));
		}
		else {
			map = new UnfoldingMap(this, 0, 0, WINDOW_WIDTH, WINDOW_HEIGHT, new Google.GoogleMapProvider());
		}
		MapUtils.createDefaultEventDispatcher(this, map);
		
		// get features from airport data
		List<PointFeature> features = ParseFeed.parseAirports(this, "data/airports.dat");
		
		// list for markers, hashmap for quicker access when matching with routes
		airportList = new ArrayList<Marker>();
		airportLocations = new HashMap<Integer, Location>();
		
		// create markers from features
		for(PointFeature feature : features) {
			AirportMarker m = new AirportMarker(feature);
	
			m.setRadius(5);
			airportList.add(m);
			
			// put airport in hashmap with OpenFlights unique id for key
			int airportId = parseAirportId(feature.getId());
			if (airportId != -1) {
				airportLocations.put(airportId, feature.getLocation());
			}
		
		}
		
		
		// parse route data
		routes = ParseFeed.parseRoutes(this, "data/routes.dat");
		routeList = new ArrayList<Marker>();

		
		map.addMarkers(airportList);
		
	}
	
	public void draw() {
		background(0);
		map.draw();
		
	}

	@Override
	public void mouseMoved()
	{
		if (lastSelected != null) {
			lastSelected.setSelected(false);
			lastSelected = null;
		}

		for (Marker marker : airportList) {
			CommonMarker airport = (CommonMarker) marker;
			if (airport.isInside(map, mouseX, mouseY)) {
				lastSelected = airport;
				airport.setSelected(true);
				return;
			}
		}
	}

	@Override
	public void mouseClicked()
	{
		Marker clickedAirport = null;

		for (Marker marker : airportList) {
			if (!marker.isHidden() && marker.isInside(map, mouseX, mouseY)) {
				clickedAirport = marker;
				break;
			}
		}

		clearRouteLines();

		if (clickedAirport == null) {
			lastClicked = null;
			return;
		}

		lastClicked = (CommonMarker) clickedAirport;
		int clickedAirportId = parseAirportId(clickedAirport.getId());
		if (clickedAirportId == -1) {
			return;
		}

		Location sourceLocation = clickedAirport.getLocation();

		for (ShapeFeature route : routes) {
			int sourceId = parseAirportId(route.getProperty("source"));
			int destinationId = parseAirportId(route.getProperty("destination"));

			if (sourceId != clickedAirportId) {
				continue;
			}

			Location destinationLocation = airportLocations.get(destinationId);
			if (destinationLocation == null) {
				continue;
			}

			List<Location> routeSegment = new ArrayList<Location>();
			routeSegment.add(sourceLocation);
			routeSegment.add(destinationLocation);

			SimpleLinesMarker routeLine = new SimpleLinesMarker(routeSegment, route.getProperties());
			routeLine.setColor(color(ROUTE_COLOR_RED, ROUTE_COLOR_GREEN, ROUTE_COLOR_BLUE));
			routeLine.setStrokeWeight(ROUTE_STROKE_WEIGHT);
			routeList.add(routeLine);
		}

		if (!routeList.isEmpty()) {
			map.addMarkers(routeList);
		}
	}

	private void clearRouteLines()
	{
		if (routeList.isEmpty()) {
			return;
		}

		try {
			map.getMarkers().removeAll(routeList);
		}
		catch (UnsupportedOperationException ex) {
			for (Marker route : routeList) {
				route.setHidden(true);
			}
		}

		routeList.clear();
	}

	private int parseAirportId(Object value)
	{
		if (value == null) {
			return -1;
		}

		String idText = value.toString().replace("\"", "").trim();
		if (idText.length() == 0) {
			return -1;
		}

		try {
			return Integer.parseInt(idText);
		}
		catch (NumberFormatException ex) {
			return -1;
		}
	}
	

}
