import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
    faBoxesStacked,
    faCarSide,
    faMotorcycle,
    faTruck,
    faVanShuttle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export type VehicleCategoryKey = 'truck' | 'van' | 'suv' | 'motorbike' | 'other';

type VehicleCategoryOption = {
  key: VehicleCategoryKey;
  label: string;
  icon: IconProp;
  blurb: string;
};

type VehicleCategoryProps = {
  selectedCategory: string;
  onSelectCategory: (category: VehicleCategoryKey) => void;
  onContinue: () => void;
};

export const VEHICLE_CATEGORY_OPTIONS: VehicleCategoryOption[] = [
  {
    key: 'truck',
    label: 'Trucks',
    icon: faTruck,
    blurb: 'Heavy-duty cargo and mining logistics.',
  },
  {
    key: 'van',
    label: 'Vans',
    icon: faVanShuttle,
    blurb: 'Mid-size deployment and secure parcel routes.',
  },
  {
    key: 'suv',
    label: 'SUVs',
    icon: faCarSide,
    blurb: 'Rapid support, escort, and field response.',
  },
  {
    key: 'motorbike',
    label: 'Motorbikes',
    icon: faMotorcycle,
    blurb: 'Fast lane access and short-range dispatch.',
  },
  {
    key: 'other',
    label: 'Other',
    icon: faBoxesStacked,
    blurb: 'Custom vehicle category for unique assets.',
  },
];

export const CATEGORY_BASE_RATE: Record<string, number> = {
  truck: 11500,
  van: 7000,
  suv: 5500,
  motorbike: 2500,
  other: 4500,
};

export default function VehicleCategory({ selectedCategory, onSelectCategory, onContinue }: VehicleCategoryProps) {
  return (
    <div className="card fleet-category-shell fade-up">
      <div className="section-label">Vehicle Categories</div>
      <p className="fleet-category-copy">
        Select your primary fleet category to start registering vehicles.
      </p>

      <div className="fleet-category-grid" role="list">
        {VEHICLE_CATEGORY_OPTIONS.map((category) => {
          const isSelected = selectedCategory === category.key;

          return (
            <button
              type="button"
              role="listitem"
              key={category.key}
              className={isSelected ? 'fleet-category-card is-selected' : 'fleet-category-card'}
              onClick={() => onSelectCategory(category.key)}
            >
              <span className="fleet-category-icon">
                <FontAwesomeIcon icon={category.icon} />
              </span>
              <span className="fleet-category-title">{category.label}</span>
              <span className="fleet-category-blurb">{category.blurb}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn-gold"
        style={{ marginTop: 16 }}
        onClick={onContinue}
      >
        Add Vehicle
      </button>
    </div>
  );
}
