package module6;

import de.fhpotsdam.unfolding.data.Feature;
import de.fhpotsdam.unfolding.data.PointFeature;
import processing.core.PConstants;
import processing.core.PGraphics;

/**
 * A class to represent AirportMarkers on a world map.
 *
 * @author Adam Setters and the UC San Diego Intermediate Software Development
 * MOOC team
 *
 */
public class AirportMarker extends CommonMarker {

	public AirportMarker(Feature city) {
		super(((PointFeature) city).getLocation(), city.getProperties());
		setId(city.getId());
	}

	@Override
	public void drawMarker(PGraphics pg, float x, float y) {
		pg.pushStyle();
		pg.fill(11);
		pg.ellipse(x, y, 5, 5);
		pg.popStyle();
	}

	@Override
	public void showTitle(PGraphics pg, float x, float y) {
		String name = getSafeTextProperty("name", "Unknown Airport");
		String city = getSafeTextProperty("city", "Unknown City");

		pg.pushStyle();
		pg.rectMode(PConstants.CORNER);
		pg.fill(255, 255, 255);
		pg.stroke(0);
		float boxWidth = Math.max(pg.textWidth(name), pg.textWidth(city)) + 8;
		pg.rect(x, y + 10, boxWidth, 34, 5);

		pg.fill(0);
		pg.textAlign(PConstants.LEFT, PConstants.TOP);
		pg.text(name, x + 4, y + 13);
		pg.text(city, x + 4, y + 27);
		pg.popStyle();
	}

	private String getSafeTextProperty(String key, String fallback)
	{
		Object value = getProperty(key);
		if (value == null) {
			return fallback;
		}

		String text = value.toString().replace("\"", "").trim();
		if (text.length() == 0 || "\\N".equals(text)) {
			return fallback;
		}

		return text;
	}

}
