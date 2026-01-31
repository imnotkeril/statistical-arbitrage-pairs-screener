"""
Position manager for tracking open trading positions
"""
from typing import Dict, List, Optional
from datetime import datetime
import threading


class Position:
    """Represents an open trading position"""
    def __init__(
        self,
        position_id: int,
        pair_id: int,
        asset_a: str,
        asset_b: str,
        side: str,  # "long" or "short"
        quantity_a: float,
        quantity_b: float,
        entry_price_a: float,
        entry_price_b: float,
        beta: float,
        entry_zscore: float
    ):
        self.position_id = position_id
        self.pair_id = pair_id
        self.asset_a = asset_a
        self.asset_b = asset_b
        self.side = side
        self.quantity_a = quantity_a
        self.quantity_b = quantity_b
        self.entry_price_a = entry_price_a
        self.entry_price_b = entry_price_b
        self.beta = beta
        self.entry_zscore = entry_zscore
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def to_dict(self) -> Dict:
        """Convert position to dictionary"""
        return {
            'position_id': self.position_id,
            'pair_id': self.pair_id,
            'asset_a': self.asset_a,
            'asset_b': self.asset_b,
            'side': self.side,
            'quantity_a': self.quantity_a,
            'quantity_b': self.quantity_b,
            'entry_price_a': self.entry_price_a,
            'entry_price_b': self.entry_price_b,
            'beta': self.beta,
            'entry_zscore': self.entry_zscore,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class PositionManager:
    """Manages open trading positions"""
    
    def __init__(self):
        self._positions: Dict[int, Position] = {}
        self._next_id = 1
        self._lock = threading.Lock()
    
    def create_position(
        self,
        pair_id: int,
        asset_a: str,
        asset_b: str,
        side: str,
        quantity_a: float,
        quantity_b: float,
        entry_price_a: float,
        entry_price_b: float,
        beta: float,
        entry_zscore: float
    ) -> Position:
        """Create a new position"""
        with self._lock:
            position_id = self._next_id
            self._next_id += 1
            
            position = Position(
                position_id=position_id,
                pair_id=pair_id,
                asset_a=asset_a,
                asset_b=asset_b,
                side=side,
                quantity_a=quantity_a,
                quantity_b=quantity_b,
                entry_price_a=entry_price_a,
                entry_price_b=entry_price_b,
                beta=beta,
                entry_zscore=entry_zscore
            )
            
            self._positions[position_id] = position
            return position
    
    def get_position(self, position_id: int) -> Optional[Position]:
        """Get position by ID"""
        with self._lock:
            return self._positions.get(position_id)
    
    def get_positions(self) -> List[Position]:
        """Get all positions"""
        with self._lock:
            return list(self._positions.values())
    
    def delete_position(self, position_id: int) -> bool:
        """Delete a position"""
        with self._lock:
            if position_id in self._positions:
                del self._positions[position_id]
                return True
            return False
    
    def calculate_pnl(
        self,
        position_id: int,
        current_price_a: float,
        current_price_b: float
    ) -> Optional[Dict]:
        """Calculate P&L for a position"""
        position = self.get_position(position_id)
        if not position:
            return None
        
        if position.side == 'long':
            pnl_a = (current_price_a - position.entry_price_a) * position.quantity_a
            pnl_b = (position.entry_price_b - current_price_b) * position.quantity_b
        else:  # short
            pnl_a = (position.entry_price_a - current_price_a) * position.quantity_a
            pnl_b = (current_price_b - position.entry_price_b) * position.quantity_b
        
        total_pnl = pnl_a + pnl_b
        
        return {
            'position_id': position_id,
            'pnl_a': pnl_a,
            'pnl_b': pnl_b,
            'total_pnl': total_pnl,
            'current_price_a': current_price_a,
            'current_price_b': current_price_b
        }

